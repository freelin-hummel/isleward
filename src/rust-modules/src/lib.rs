#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

#[napi]
pub mod physics {
    use napi::{
        bindgen_prelude::{External, ObjectFinalize},
        JsObject,
    };
    use petgraph::{algo, prelude::*, Graph, Undirected};
    use tracing::{debug, error};

    #[napi(object)]
    pub struct Physics {
        pub graph: External<UnGraph<(), ()>>,
        pub collision_map: Vec<Vec<i32>>,
        pub cells: Vec<Vec<Vec<PhysicsObject>>>,
        pub width: i32,
        pub height: i32,
    }

    #[derive(Debug, Clone)]
    #[napi(object)]
    pub struct PhysicsObject {
        pub x: i32,
        pub y: i32,
        pub width: i32,
        pub height: i32,
        pub id: String,
        // area: Vec<i32>
    }

    #[derive(Debug, Clone, Copy)]
    #[napi(object)]
    pub struct Coordinate {
        pub x: f64,
        pub y: f64,
    }

    #[derive(Debug, Clone, Copy)]
    #[napi(object)]
    pub struct IntCoordinate {
        pub x: i32,
        pub y: i32,
    }

    impl PartialEq for PhysicsObject {
        fn eq(&self, other: &Self) -> bool {
            self.id == other.id
        }
    }

    impl From<&JsObject> for PhysicsObject {
        fn from(value: &JsObject) -> Self {
            let id = match value.get_named_property::<i32>("id") {
                Ok(num) => num.to_string(),
                Err(e) => {
                    debug!("{e:?} <- Number from js");
                    value
                        .get_named_property::<String>("id")
                        .unwrap_or_else(|e| {
                            error!("{e:?}. Could not get a string id from js");
                            String::new()
                        })
                }
            };

            PhysicsObject {
                x: value.get_named_property("x").unwrap_or_default(),
                y: value.get_named_property("y").unwrap_or_default(),
                width: value.get_named_property("width").unwrap_or_default(),
                height: value.get_named_property("height").unwrap_or_default(),
                id,
            }
        }
    }

    impl ObjectFinalize for Physics {
        fn finalize(self, _env: napi::Env) -> napi::Result<()> {
            //TODO: Check if the External object needs some kind of manual cleanup
            Ok(())
        }
    }

    #[napi]
    impl Physics {
        #[napi(constructor)]
        pub fn init(collision_map: Vec<Vec<i32>>, width: i32, height: i32) -> Physics {
            let mut cells = Vec::with_capacity(width.try_into().unwrap());
            for _ in 0..width {
                let mut row = Vec::with_capacity(height.try_into().unwrap());
                for _ in 0..height {
                    row.push(vec![]);
                }
                cells.push(row);
            }

            Physics {
                graph: matrix_to_graph(&collision_map).into(),
                collision_map,
                cells,
                width,
                height,
            }
        }

        #[napi]
        pub fn add_region(&mut self, jobj: JsObject) -> Vec<String> {
            let obj = PhysicsObject::from(&jobj);
            let low_x = obj.x;
            let low_y = obj.y;
            let high_x = low_x + obj.width;
            let high_y = low_y + obj.height;
            let cells = &mut self.cells;
            let mut ret = vec![];

            for i in low_x..high_x {
                let i: usize = i.try_into().unwrap();
                if i > cells.len() {
                    continue;
                }
                let row = &mut cells[i];
                for j in low_y..high_y {
                    let j: usize = j.try_into().unwrap();
                    if j > row.len() {
                        continue;
                    }
                    let cells = &mut row[j];

                    for c in &mut *cells {
                        if !ret.contains(&c.id) {
                            ret.push(c.id.to_string());
                        }
                    }
                    cells.push(obj.clone());
                }
            }
            ret
        }

        pub fn remove_region(&mut self, jobj: JsObject) -> Vec<String> {
            let obj = PhysicsObject::from(&jobj);
            let o_id = obj.id;

            let low_x = obj.x;
            let low_y = obj.y;
            let high_x = low_x + obj.width;
            let high_y = low_y + obj.height;
            let cells = &mut self.cells;
            let mut ret = vec![];

            let mut remove_ids = vec![];
            for i in low_x..high_x {
                let i: usize = i.try_into().unwrap();
                let row = &mut cells[i];
                for j in low_y..high_y {
                    let j: usize = j.try_into().unwrap();
                    let cells = &mut row[j];

                    if cells.is_empty() {
                        continue;
                    }
                    remove_ids.clear();
                    for c in &mut *cells {
                        if c.id != o_id {
                            if !ret.contains(&c.id) {
                                ret.push(c.id.to_string());
                            }
                        } else {
                            remove_ids.push(c.clone());
                        }
                    }

                    cells.retain(|c| !remove_ids.contains(c));
                }
            }
            ret
        }

        #[napi]
        pub fn before_add_object(
            &self,
            x: i32,
            y: i32,
            from_x: Option<i32>,
            from_y: Option<i32>,
        ) -> Option<Vec<String>> {
            let x: usize = x.try_into().unwrap();
            if x >= self.cells.len() {
                return None;
            }
            let row: &[Vec<PhysicsObject>] = &self.cells[x];
            let y: usize = y.try_into().unwrap();
            if y >= row.len() {
                return None;
            }

            let cell: &[PhysicsObject] = &row[y];

            let mut ret = vec![];
            for c in cell {
                //If we have from_x and from_y, check if the target cell doesn't contain the same obj (like a notice area)
                if c.width == 0 && from_x.is_some() && from_y.is_some() {
                    // if (c.area) {
                    //     if ((this.isInPolygon(x, y, c.area)) && (!this.isInPolygon(from_x, from_y, c.area))) {
                    //         c.collisionEnter(obj);
                    //         obj.collisionEnter(c);
                    //     }
                    // } else
                    let from_x = from_x.unwrap();
                    let from_y = from_y.unwrap();
                    if (from_x < c.x
                        || from_y < c.y
                        || from_x >= c.x + c.width
                        || from_y >= c.y + c.height)
                        && !ret.contains(&c.id)
                    {
                        ret.push(c.id.to_string());
                    }
                } else if !ret.contains(&c.id) {
                    ret.push(c.id.to_string());
                }
            }

            Some(ret)
        }

        #[napi]
        pub fn add_object(&mut self, obj: JsObject, x: i32, y: i32) {
            let x: usize = x.try_into().unwrap();
            if x >= self.cells.len() {
                return;
            }
            let row: &mut Vec<Vec<PhysicsObject>> = &mut self.cells[x];
            let y: usize = y.try_into().unwrap();
            if y >= row.len() {
                return;
            }

            let cell: &mut Vec<PhysicsObject> = &mut row[y];

            let obj = PhysicsObject::from(&obj);

            cell.push(obj);
        }

        #[napi]
        pub fn remove_object(
            &mut self,
            obj: JsObject,
            x: i32,
            y: i32,
            to_x: Option<i32>,
            to_y: Option<i32>,
        ) -> Option<Vec<String>> {
            let obj = PhysicsObject::from(&obj);

            let cells = &mut self.cells;

            let x: usize = x.try_into().unwrap();
            if x >= cells.len() {
                return None;
            }
            let row = &mut cells[x];
            let y: usize = y.try_into().unwrap();
            if y >= row.len() {
                return None;
            }

            let cell = &mut row[y];

            let mut ret = vec![];
            let mut remove_ids = vec![];

            for c in &mut *cell {
                if c.id != obj.id {
                    //If we have from_x and from_y, check if the target cell doesn't contain the same obj (like a notice area)
                    if c.width == 0 && to_x.is_some() && to_y.is_some() {
                        // if (c.area) {
                        //     if ((this.isInPolygon(x, y, c.area)) && (!this.isInPolygon(from_x, from_y, c.area))) {
                        //         c.collisionExit(obj);
                        //         obj.collisionExit(c);
                        //     }
                        // } else
                        let to_x = to_x.unwrap();
                        let to_y = to_y.unwrap();
                        if (to_x < c.x
                            || to_y < c.y
                            || to_x >= c.x + c.width
                            || to_y >= c.y + c.height)
                            && !ret.contains(&c.id)
                        {
                            ret.push(c.id.to_string());
                        }
                    } else if !ret.contains(&c.id) {
                        ret.push(c.id.to_string());
                    }
                } else {
                    remove_ids.push(c.clone());
                }
            }

            cell.retain(|c| !remove_ids.contains(c));

            Some(ret)
        }

        #[napi]
        pub fn get_cell(&self, x: i32, y: i32) -> Option<Vec<String>> {
            let x: usize = x.try_into().unwrap();
            if x >= self.cells.len() {
                return None;
            }
            let row: &[Vec<PhysicsObject>] = &self.cells[x];
            let y: usize = y.try_into().unwrap();
            if y >= row.len() {
                return None;
            }

            let cell: &[PhysicsObject] = &row[y];

            let mut ret = vec![];
            for c in cell {
                ret.push(c.id.to_string());
            }

            Some(ret)
        }

        #[napi]
        pub fn get_area(&mut self, x1: i32, y1: i32, x2: i32, y2: i32) -> Option<Vec<String>> {
            let cells = &mut self.cells;

            let mut ret = vec![];

            for i in x1..=x2 {
                let i: usize = i.try_into().unwrap();
                let row = &mut cells[i];
                for j in y1..=y2 {
                    let j: usize = j.try_into().unwrap();
                    let cells = &mut row[j];

                    if cells.is_empty() {
                        continue;
                    }
                    for c in &mut *cells {
                        ret.push(c.id.to_string());
                    }
                }
            }

            Some(ret)
        }

        #[napi]
        pub fn get_open_cell_in_area(
            &mut self,
            x1: i32,
            y1: i32,
            x2: i32,
            y2: i32,
        ) -> Option<Vec<IntCoordinate>> {
            let cells = &mut self.cells;
            let collision_map = &self.collision_map;

            let mut ret = vec![];

            for i in x1..=x2 {
                let i: usize = i.try_into().unwrap();
                let row = &mut cells[i];
                for j in y1..=y2 {
                    let j: usize = j.try_into().unwrap();
                    let cell = &mut row[j];

                    if collision_map[i][j] == 1 {
                        continue;
                    }

                    if !cell.is_empty() {
                        if !cell.iter().any(|c| c.width == 0) {
                            ret.push(IntCoordinate {
                                x: i as i32,
                                y: j as i32,
                            });
                        }

                        continue;
                    }

                    ret.push(IntCoordinate {
                        x: i as i32,
                        y: j as i32,
                    });
                }
            }

            Some(ret)
        }

        #[napi]
        pub fn get_path(
            &self,
            from_x: i32,
            to_x: i32,
            from_y: i32,
            to_y: i32,
        ) -> Option<Vec<Coordinate>> {
            let from = self
                .graph
                .node_indices()
                .nth((from_y * self.width + from_x).try_into().unwrap())
                .unwrap();
            let to = self
                .graph
                .node_indices()
                .nth((to_y * self.width + to_x).try_into().unwrap())
                .unwrap();

            if let Some(ids) =
                algo::astar(&*self.graph, from, |finish| finish == to, |_| 0, |_| 0).map(|(_, x)| x)
            {
                return Some(
                    ids.into_iter()
                        .map(|id| {
                            let y = (id.index() as f64 / self.width as f64).floor();
                            let x = id.index() as f64 - y * self.width as f64;
                            Coordinate { x, y }
                        })
                        .collect(),
                );
            }
            None
        }
    }

    // Function to create a graph from a 2D matrix
    fn matrix_to_graph(matrix: &[Vec<i32>]) -> Graph<(), (), Undirected> {
        let mut graph = Graph::new_undirected();
        let size = matrix.len();
        let inner_size = matrix[0].len();
        let mut nodes = vec![vec![NodeIndex::default(); inner_size]; size];

        // Add nodes to the graph
        for row in nodes.iter_mut() {
            for cell in row.iter_mut() {
                *cell = graph.add_node(());
            }
        }

        // Add edges based on the collision map
        for i in 1..size - 1 {
            for j in 1..inner_size - 1 {
                if matrix[i][j] == 0 {
                    continue;
                }
                for x in i - 1..=i + 1 {
                    for y in j - 1..=j + 1 {
                        if x == i && y == j {
                            continue;
                        }
                        let from = nodes[i][j];
                        let to = nodes[x][y];
                        if matrix[x][y] == 1 && graph.find_edge(from, to).is_none() {
                            graph.add_edge(from, to, ());
                        }
                    }
                }
            }
        }

        graph
    }
}

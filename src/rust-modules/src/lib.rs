#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

#[napi]
pub mod logging {
    use napi::bindgen_prelude::ObjectFinalize;
    use tracing_subscriber::fmt::format::FmtSpan;
    use tracing_subscriber::prelude::__tracing_subscriber_SubscriberExt;
    use tracing_subscriber::util::SubscriberInitExt;

    #[napi(object)]
    pub struct LogInstance {
        pub sub: (),
    }

    impl Default for LogInstance {
        fn default() -> Self {
            Self::new()
        }
    }

    #[napi]
    impl LogInstance {
        #[napi(constructor)]
        pub fn new() -> Self {
            Self {
                sub: tracing_subscriber::registry()
                    .with(
                        tracing_subscriber::EnvFilter::try_from_default_env()
                            .unwrap_or_else(|_| "info".into()),
                    )
                    .with(tracing_subscriber::fmt::layer().with_span_events(FmtSpan::CLOSE))
                    .init(),
            }
        }
    }

    impl ObjectFinalize for LogInstance {
        fn finalize(self, _env: napi::Env) -> napi::Result<()> {
            //TODO: Check if the External object needs some kind of manual cleanup
            Ok(())
        }
    }
}

#[napi]
pub mod physics {

    use napi::{
        bindgen_prelude::{External, Null, ObjectFinalize, Undefined},
        JsObject,
    };
    use petgraph::{algo, prelude::*, visit::IntoNodeReferences, Graph};
    use tracing::{debug, error};

    type PhysicsGraph = UnGraph<Coordinate, ()>;
    type Area = Vec<Vec<i32>>;

    #[napi(object)]
    pub struct Physics {
        pub graph: External<PhysicsGraph>,
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
        pub is_notice: bool,
        pub area: Option<Area>,
    }

    #[derive(Debug, Clone, Copy, PartialEq)]
    #[napi(object)]
    pub struct Coordinate {
        pub x: i32,
        pub y: i32,
    }

    impl Coordinate {
        fn find_node(&self, gr: &PhysicsGraph) -> Option<NodeIndex> {
            gr.node_references()
                .find(|(_, c)| *c == self)
                .map(|(i, _)| i)
        }
    }

    impl ToString for Coordinate {
        fn to_string(&self) -> String {
            let Self { x, y } = self;
            format!("{x};{y}")
        }
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

            assert!(value.get_named_property::<Null>("notice").is_err());
            assert!(value.get_named_property::<Null>("area").is_err());

            PhysicsObject {
                x: value.get_named_property("x").unwrap_or_default(),
                y: value.get_named_property("y").unwrap_or_default(),
                width: value.get_named_property("width").unwrap_or_default(),
                height: value.get_named_property("height").unwrap_or_default(),
                is_notice: !is_undefined(value, "notice"),
                area: match (
                    is_undefined(value, "notice"),
                    value.get_named_property::<Vec<Vec<i32>>>("area"),
                ) {
                    (true, _) => None,
                    (_, Ok(v)) if !v.is_empty() => Some(v),
                    (_, Ok(_empty_list)) => None,
                    (false, Err(area_error)) => {
                        debug!("PhysicsObject get_named_property: {area_error}");
                        None
                    }
                },
                id,
            }
        }
    }

    fn is_undefined(value: &JsObject, name: &str) -> bool {
        value.get_named_property::<Undefined>(name).is_ok()
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

            debug!("Building graph.");
            let graph = matrix_to_graph(&collision_map).into();
            debug!("Physics initialized");

            Physics {
                graph,
                collision_map,
                cells,
                width,
                height,
            }
        }

        #[napi]
        pub fn add_region(
            &mut self,
            jobj: JsObject,
            from_x: Option<i32>,
            from_y: Option<i32>,
            from_width: Option<i32>,
            from_height: Option<i32>,
        ) -> Vec<String> {
            let obj = PhysicsObject::from(&jobj);
            let low_x = obj.x;
            let low_y = obj.y;
            let high_x = low_x + obj.width;
            let high_y = low_y + obj.height;
            let cells = &mut self.cells;
            let mut ret = vec![];

            for i in low_x..high_x {
                let i: usize = i.try_into().unwrap();
                if i >= cells.len() {
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
                            if from_x.is_some()
                                && from_y.is_some()
                                && from_width.is_some()
                                && from_height.is_some()
                            {
                                let from_x = from_x.unwrap();
                                let from_y = from_y.unwrap();
                                let from_width = from_width.unwrap();
                                let from_height = from_height.unwrap();

                                if from_x + from_width <= c.x
                                    || from_x > c.x
                                    || from_y + from_height <= c.y
                                    || from_y > c.y
                                {
                                    ret.push(c.id.to_string());
                                }
                            } else {
                                ret.push(c.id.to_string());
                            }
                        }
                    }
                    cells.push(obj.clone());
                }
            }
            ret
        }

        #[napi]
        pub fn remove_region(
            &mut self,
            jobj: JsObject,
            to_x: Option<i32>,
            to_y: Option<i32>,
            to_width: Option<i32>,
            to_height: Option<i32>,
        ) -> Vec<String> {
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
                                if to_x.is_some()
                                    && to_y.is_some()
                                    && to_width.is_some()
                                    && to_height.is_some()
                                {
                                    let to_x = to_x.unwrap();
                                    let to_y = to_y.unwrap();
                                    let to_width = to_width.unwrap();
                                    let to_height = to_height.unwrap();

                                    if to_x + to_width <= c.x
                                        || to_x > c.x
                                        || to_y + to_height <= c.y
                                        || to_y > c.y
                                    {
                                        ret.push(c.id.to_string());
                                    }
                                } else {
                                    ret.push(c.id.to_string());
                                }
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
            let xi: usize = x.try_into().unwrap();
            if xi >= self.cells.len() {
                return None;
            }
            let row: &[Vec<PhysicsObject>] = &self.cells[xi];
            let yi: usize = y.try_into().unwrap();
            if yi >= row.len() {
                return None;
            }

            let cell: &[PhysicsObject] = &row[yi];

            let mut ret = vec![];
            for c in cell {
                //If we have from_x and from_y, check if the target cell doesn't contain the same obj (like a notice area)
                if c.width != 0 && from_x.is_some() && from_y.is_some() {
                    let from_x = from_x.unwrap();
                    let from_y = from_y.unwrap();
                    if let Some(area) = &c.area {
                        if self.is_in_polygon_int(x, y, area)
                            && !self.is_in_polygon_int(from_x, from_y, area)
                            && !ret.contains(&c.id)
                        {
                            ret.push(format!("enter|{}", c.id));
                        }
                    } else if (from_x < c.x
                        || from_y < c.y
                        || from_x >= c.x + c.width
                        || from_y >= c.y + c.height)
                        && !ret.contains(&c.id)
                    {
                        ret.push(format!("enter|{}", c.id));
                    } else if from_x >= c.x
                        && from_y >= c.y
                        && from_x < c.x + c.width
                        && from_y < c.y + c.height
                        && !ret.contains(&c.id)
                    {
                        ret.push(format!("stay|{}", c.id));
                    }
                } else if !ret.contains(&c.id) {
                    ret.push(format!("enter|{}", c.id));
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

            let cells = &self.cells;

            let xi: usize = x.try_into().unwrap();
            if xi >= cells.len() {
                return None;
            }
            let row = &cells[xi];
            let yi: usize = y.try_into().unwrap();
            if yi >= row.len() {
                return None;
            }

            let cell = &row[yi];

            let mut remove_ids = vec![];
            let mut ret = vec![];

            for c in cell {
                if c.id != obj.id {
                    //If we have from_x and from_y, check if the target cell doesn't contain the same obj (like a notice area)
                    if c.width != 0 && to_x.is_some() && to_y.is_some() {
                        let to_x = to_x.unwrap();
                        let to_y = to_y.unwrap();
                        if let Some(area) = &c.area {
                            if (self.is_in_polygon_int(x, y, area))
                                && (!self.is_in_polygon_int(to_x, to_y, area))
                                && !ret.contains(&c.id)
                            {
                                ret.push(c.id.to_string())
                            }
                        } else if (to_x < c.x
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
            let cell = &mut self.cells[xi][yi];
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
            return Some(cell.iter().map(|x| x.id.to_string()).collect());
        }

        #[napi]
        pub fn get_area(&mut self, x1: i32, y1: i32, x2: i32, y2: i32) -> Vec<String> {
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

            ret
        }

        #[napi]
        pub fn get_open_cell_in_area(
            &mut self,
            x1: i32,
            y1: i32,
            x2: i32,
            y2: i32,
        ) -> Vec<IntCoordinate> {
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
                        if !cell.iter().any(|c| !c.is_notice) {
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

            ret
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
                .node_references()
                .find(|(_, Coordinate { x, y })| from_y == *y && from_x == *x)
                .map(|(i, _)| i)
                .unwrap();
            let (to, to_coord) = self
                .graph
                .node_references()
                .find(|(_, Coordinate { x, y })| to_x == *x && to_y == *y)
                .unwrap();

            if let Some(ids) = algo::astar(
                &*self.graph,
                from,
                |finish| finish == to,
                |_| 0,
                |n| {
                    let Coordinate { x, y } = self.graph[n];
                    *[(x - to_coord.x).abs(), (y - to_coord.y).abs()]
                        .iter()
                        .max()
                        .unwrap()
                },
            )
            .map(|(_, x)| x)
            {
                return Some(ids.into_iter().skip(1).map(|id| self.graph[id]).collect());
            }
            None
        }

        #[napi]
        pub fn does_collide(&self, x: i32, y: i32) -> bool {
            let collision_map = &self.collision_map;
            let xi: usize = x.try_into().unwrap();
            let yi: usize = y.try_into().unwrap();

            collision_map[xi][yi] == 1
        }

        #[napi]
        pub fn has_los(&self, from_x: i32, from_y: i32, to_x: i32, to_y: i32) -> bool {
            let collision_map = &self.collision_map;

            // Convert coordinates once.
            let fx = from_x as usize;
            let fy = from_y as usize;

            // Check start and target collision status.
            if collision_map[fx][fy] == 1 {
                return false;
            }

            let tx = to_x as usize;
            let ty = to_y as usize;

            if collision_map[tx][ty] == 1 {
                return false;
            }

            // Compute deltas and distance.
            let dx = (to_x - from_x) as f64;
            let dy = (to_y - from_y) as f64;
            let distance = (dx * dx + dy * dy).sqrt();

            // Normalize to get per-step increments.
            let step_x = dx / distance;
            let step_y = dy / distance;

            // Start at center of the starting tile.
            let mut curr_x = from_x as f64 + 0.5;
            let mut curr_y = from_y as f64 + 0.5;

            debug!("float distance: {distance}");
            let steps = distance.ceil() as usize;
            debug!("int distance (steps): {steps}");

            for _ in 0..steps {
                curr_x += step_x;
                curr_y += step_y;
                let ix = curr_x.floor() as usize;
                let iy = curr_y.floor() as usize;

                if collision_map[ix][iy] == 1 {
                    return false;
                } else if ix == tx && iy == ty {
                    return true;
                }
            }
            true
        }

        #[napi]
        pub fn is_in_polygon(&self, x: i32, y: i32, verts: Area) -> bool {
            self.is_in_polygon_int(x, y, &verts)
        }

        /// Sets a collision at the specified (x, y) position by updating the collision_map
        /// and removing all edges connected to the corresponding node in the graph.
        ///
        /// # Arguments
        ///
        /// * `x` - The x-coordinate where the collision is to be set.
        /// * `y` - The y-coordinate where the collision is to be set.
        ///
        /// # Returns
        ///
        /// * `napi::Result<()>` - Returns Ok(()) if successful, otherwise returns an error.
        #[napi]
        pub fn set_collision(&mut self, x: i32, y: i32, does_collide: i32) -> napi::Result<()> {
            let xi: usize = x
                .try_into()
                .map_err(|_| napi::Error::from_reason("Invalid x coordinate"))?;
            let yi: usize = y
                .try_into()
                .map_err(|_| napi::Error::from_reason("Invalid y coordinate"))?;

            if xi >= self.collision_map.len() || yi >= self.collision_map[0].len() {
                return Err(napi::Error::from_reason("x or y out of bounds"));
            }

            if self.collision_map[xi][yi] == does_collide {
                return Ok(());
            }

            self.collision_map[xi][yi] = does_collide;

            let graph: &mut PhysicsGraph = &mut self.graph;

            let coord = Coordinate { x, y };

            //If the node now collides, remove all edges to it
            if does_collide == 1 {
                let Some(from_node) = coord.find_node(graph) else {
                    return Err(napi::Error::from_reason("Node not found in graph"));
                };
                let connected_edges: Vec<_> =
                    graph.edges(from_node).map(|edge| edge.id()).collect();

                for edge_id in connected_edges {
                    graph.remove_edge(edge_id);
                }
            } else if does_collide == 0 {
                let from_node = coord.find_node(graph).unwrap();

                for ix in x - 1..=x + 1 {
                    let ixu: usize = ix.try_into().expect("x conversion to usize failed");
                    for iy in y - 1..=y + 1 {
                        if ix == x && iy == y {
                            continue;
                        }
                        let iyu: usize = iy.try_into().expect("x conversion to usize failed");
                        if self.collision_map[ixu][iyu] == 1 {
                            continue;
                        }

                        let to_node = Coordinate { x: ix, y: iy }.find_node(graph).unwrap();

                        graph.add_edge(from_node, to_node, ());
                    }
                }
            }

            Ok(())
        }

        #[inline(always)]
        pub fn is_in_polygon_int(&self, x: i32, y: i32, verts: &Area) -> bool {
            let mut inside = false;

            let v_len = verts.len();

            let mut i = 0;
            let mut j = v_len - 1;

            while i < v_len {
                let vi = &verts[i];
                let vj = &verts[j];

                let xi = vi[0];
                let yi = vi[1];
                let xj = vj[0];
                let yj = vj[1];

                let does_intersect =
                    ((yi > y) != (yj > y)) && (x < ((((xj - xi) * (y - yi)) / (yj - yi)) + xi));

                if does_intersect {
                    inside = !inside;
                }
                j = i;
                i += 1;
            }

            inside
        }
    }

    // Function to create a graph from a 2D matrix
    fn matrix_to_graph(matrix: &[Vec<i32>]) -> PhysicsGraph {
        let size = matrix.len();
        let inner_size = matrix[0].len();
        let mut graph = Graph::with_capacity(size * inner_size, inner_size * size * 8);

        // Create a 2D vector to store node indices.
        let mut nodes = vec![vec![NodeIndex::end(); inner_size]; size];

        // Add nodes to the graph and store their indices.
        for (x, row) in nodes.iter_mut().enumerate() {
            for (y, cell) in row.iter_mut().enumerate() {
                let coord = Coordinate {
                    x: x as i32,
                    y: y as i32,
                };
                let node = graph.add_node(coord);
                *cell = node;
            }
        }

        // Add edges based on the collision map.
        for i in 1..size - 1 {
            for j in 1..inner_size - 1 {
                if matrix[i][j] == 1 {
                    continue;
                }
                let from = nodes[i][j];

                // Check neighbors in the 3x3 region around (i, j)
                for x in (i.saturating_sub(1))..=(i + 1) {
                    for y in (j.saturating_sub(1))..=(j + 1) {
                        if x == i && y == j {
                            continue;
                        }
                        if matrix[x][y] == 1 {
                            continue;
                        }
                        let to = nodes[x][y];
                        graph.add_edge(from, to, ());
                    }
                }
            }
        }

        graph
    }
}

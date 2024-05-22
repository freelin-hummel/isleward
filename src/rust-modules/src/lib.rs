#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

#[napi]
pub mod physics {
    use napi::{
        bindgen_prelude::{External, ObjectFinalize},
        JsObject,
    };
    use petgraph::Graph;

    #[napi(object)]
    pub struct Physics {
        pub graph: External<Graph<(), ()>>,
        pub collision_map: Vec<Vec<bool>>,
        pub cells: Vec<Vec<Vec<i32>>>,
        pub width: i32,
        pub height: i32,
    }

    pub struct PhysicsObject {
        x: i32,
        y: i32,
        width: i32,
        height: i32,
        id: i32,
        // area: Vec<i32>
    }

    impl From<&JsObject> for PhysicsObject {
        fn from(value: &JsObject) -> Self {
            PhysicsObject {
                x: value.get_named_property("x").unwrap_or_default(),
                y: value.get_named_property("y").unwrap_or_default(),
                width: value.get_named_property("width").unwrap_or_default(),
                height: value.get_named_property("height").unwrap_or_default(),
                id: value.get_named_property("id").unwrap_or_default(),
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
        pub fn init(width: i32, height: i32) -> Physics {
            let mut cells = Vec::with_capacity(width.try_into().unwrap());
            for _ in 0..width {
                let mut row = Vec::with_capacity(height.try_into().unwrap());
                for _ in 0..height {
                    row.push(vec![]);
                }
                cells.push(row);
            }

            Physics {
                graph: Graph::new().into(),
                collision_map: vec![],
                cells,
                width: 0,
                height: 0,
            }
        }

        #[napi]
        pub fn add_region(&mut self, jobj: JsObject) -> Vec<i32> {
            let obj = PhysicsObject::from(&jobj);
            let low_x = obj.x;
            let low_y = obj.y;
            let high_x = low_x + obj.width;
            let high_y = low_y + obj.height;
            let cells = &mut self.cells;
            let mut ret = vec![];

            dbg!(obj.id);
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
                        if !ret.contains(c) {
                            ret.push(*c);
                        }
                    }
                    cells.push(obj.id);
                }
            }
            dbg!(&ret);
            ret
        }

        pub fn remove_region(&mut self, jobj: JsObject) -> Vec<i32> {
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
                        if *c != o_id {
                            if !ret.contains(c) {
                                ret.push(*c);
                            }
                        } else {
                            remove_ids.push(*c);
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
            obj: JsObject,
            x: i32,
            y: i32,
            fromX: i32,
            fromY: i32,
        ) -> Option<Vec<i32>> {
            if x >= self.cells.len() {
                return None;
            }
            let row = &self.cells[x];
            if y >= row.len() {
                return None;
            }

            let cell = row[y];

            let cLen = cell.len();
            let mut ret = vec![];
            for i in 0..cLen {
                let c = cell[i];

                //If we have fromX and fromY, check if the target cell doesn't contain the same obj (like a notice area)
                if (c.width) && (fromX) {
                    // if (c.area) {
                    //     if ((this.isInPolygon(x, y, c.area)) && (!this.isInPolygon(fromX, fromY, c.area))) {
                    //         c.collisionEnter(obj);
                    //         obj.collisionEnter(c);
                    //     }
                    // } else
                    if (fromX < c.x)
                        || (fromY < c.y)
                        || (fromX >= c.x + c.width)
                        || (fromY >= c.y + c.height)
                    {
                        if !ret.contains(c) {
                            ret.push(c);
                        }
                    }
                } else {
                    //If a callback returns true, it means we collide
                    if !ret.contains(c) {
                        ret.push(c)
                    }
                }
            }

            return Some(ret);
        }
    }
}

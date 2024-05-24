const objects = require('../objects/objects');
let pathfinder = require('../misc/pathfinder');
const rm = require('../../rust-modules');

let sqrt = Math.sqrt.bind(Math);
let ceil = Math.ceil.bind(Math);
let mathRand = Math.random.bind(Math);

module.exports = {
	graph: null,

	collisionMap: null,
	cells: [],
	width: 0,
	height: 0,

	init: function (collisionMap) {
		this.collisionMap = collisionMap;

		this.width = collisionMap.length;
		this.height = collisionMap[0].length;
		this.ph = new rm.physics.Physics(collisionMap, this.width, this.height);

		this.cells = _.get2dArray(this.width, this.height, 'array');

		this.graph = new pathfinder.Graph(collisionMap, {
			diagonal: true
		});
	},

	addRegion: function (obj) {
		const idsOfCollidingObjects = this.ph.addRegion(obj);
		
		for (let id of idsOfCollidingObjects) {
			const f = objects.objects.find(o => o.id + '' === id);

			f.collisionEnter(obj);
			obj.collisionEnter(f);
		}
	},

	removeRegion: function (obj) {
		const idsOfCollidingObjects = this.ph.removeRegion(obj);

		for (let id of idsOfCollidingObjects) {
			const f = objects.objects.find(o => o.id + '' === id);

			f.collisionExit(obj);
			obj.collisionExit(f);
		}
	},

	addObject: function (obj, x, y, fromX, fromY) {
		const idsOfCollidingObjects = this.ph.beforeAddObject(x, y, fromX, fromY);

		for (let id of idsOfCollidingObjects) {
			const checkObj = objects.objects.find(f => f.id + '' === id);

			// TODO: Ensure these can be ignored. Possible the object has already been deleted from the world
			if (!checkObj)
				continue;
			else if (checkObj.collisionEnter(obj)) 
				return;
			
			obj.collisionEnter(checkObj);
		}

		this.ph.addObject(obj, x, y);

		return true;
	},

	removeObject: function (obj, x, y, toX, toY) {
		const idsOfCollidingObjects = this.ph.removeObject(obj, x, y, toX, toY);

		for (let id of idsOfCollidingObjects) {
			const checkObj = objects.objects.find(f => f.id + '' === id);

			checkObj.collisionExit(obj); 
			obj.collisionExit(checkObj);
		}
	},

	isValid: function (x, y) {
		const isInvalid = (
			x < 0 ||
			x >= this.width ||
			y < 0 ||
			y >= this.height ||
			this.collisionMap[x][y] === 1
		);

		return !isInvalid;
	},

	getCell: function (x, y) {
		const idsOfObjects = this.ph.getCell(x, y);

		const res = idsOfObjects.map(id => objects.objects.find(f => f.id + '' === id));

		return res;
	},
	getArea: function (x1, y1, x2, y2, filter) {
		const { width, height } = this;

		const idsOfObjects = this.ph.getArea(
			Math.max(0, x1),
			Math.max(0, y1),
			Math.min(x2, width - 1),
			Math.min(y2, height - 1)
		);

		let res = idsOfObjects.map(id => objects.objects.find(f => f.id + '' === id));

		if (filter)
			res = res.filter(f => filter(f));

		return res;
	},

	getOpenCellInArea: function (x1, y1, x2, y2) {
		const { width, height } = this;

		const cellCoordinates = this.ph.getOpenCellInArea(
			Math.max(0, x1),
			Math.max(0, y1),
			Math.min(x2, width - 1),
			Math.min(y2, height - 1)
		);

		const firstEntry = cellCoordinates.find(c => {
			const contents = this.getCell(c.x, c.y);

			//If the only contents are notices, we can still use it
			return (
				contents.length === 0 ||
				!contents.some(f => !f.notice)
			);
		});

		return firstEntry;
	},

	getPath: function (from, to) {
		let graph = this.graph;
		let grid = graph.grid;

		if (!to) {
			to = {
				x: ~~(mathRand() * grid.length),
				y: ~~(mathRand() * grid[0].length)
			};
		}

		let fromX = ~~from.x;
		let fromY = ~~from.y;

		if ((!grid[fromX]) || (grid[fromX].length <= fromY) || (fromX < 0) || (fromY < 0))
			return [];

		let toX = ~~to.x;
		let toY = ~~to.y;

		if ((!grid[toX]) || (grid[toX].length <= toY) || (toX < 0) || (toY < 0))
			return [];

		let path = this.ph.getPath(fromX, toX, fromY, toY);
		if (!path) 
			return [];

		return path;
	},
	isTileBlocking: function (x, y) {
		if ((x < 0) || (y < 0) || (x >= this.width) | (y >= this.height))
			return true;

		x = ~~x;
		y = ~~y;

		let node = this.graph.grid[x][y];
		if (node)
			return (node.weight === 0);
		return true;
	},
	isCellOpen: function (x, y) {
		if ((x < 0) || (y < 0) || (x >= this.width) | (y >= this.height))
			return true;

		let cells = this.cells[x][y];
		let cLen = cells.length;
		for (let i = 0; i < cLen; i++) {
			let c = cells[i];
			if (!c.notice)
				return false;
		}

		return true;
	},
	hasLos: function (fromX, fromY, toX, toY) {
		return this.ph.hasLos(...arguments);
	},

	getClosestPos: function (fromX, fromY, toX, toY, target, obj) {
		let tried = {};

		let hasLos = this.hasLos.bind(this, toX, toY);

		let width = this.width;
		let height = this.height;

		let collisionMap = this.collisionMap;
		let cells = this.cells;

		let reverseX = (fromX > toX);
		let reverseY = (fromY > toY);

		for (let c = 1; c <= 10; c++) {
			let x1 = toX - c;
			let y1 = toY - c;
			let x2 = toX + c;
			let y2 = toY + c;

			let lowX, lowY, highX, highY, incX, incY;

			if (reverseX) {
				incX = -1;
				lowX = x2;
				highX = x1 - 1;
			} else {
				incX = 1;
				lowX = x1;
				highX = x2 + 1;
			}

			if (reverseY) {
				incY = -1;
				lowY = y2;
				highY = y1 - 1;
			} else {
				incY = 1;
				lowY = y1;
				highY = y2 + 1;
			}

			for (let i = lowX; i !== highX; i += incX) {
				if ((i < 0) || (i >= width))
					continue;

				let row = collisionMap[i];
				let cellRow = cells[i];

				let t = tried[i];
				if (!t) 
					t = tried[i] = {};

				for (let j = lowY; j !== highY; j += incY) {
					if (t[j])
						continue;

					t[j] = 1;

					if (
						((i === toX) && (j === toY)) ||
						((j < 0) || (j >= height)) ||
						(row[j])
					)
						continue;

					if (target && obj) {
						let cell = cellRow[j];
						if (this.mobsCollide(i, j, obj, target, cell))
							continue;
					}

					if (!hasLos(i, j))
						continue;

					return {
						x: i,
						y: j
					};
				}
			}
		}
	},

	//If we pass through a cell it means we want to move to this location but need to check aggro
	mobsCollide: function (x, y, obj, target, cell) {
		const allowOne = !cell;

		if (!cell) {
			if (x < 0 || y < 0 || x >= this.width | y >= this.height)
				return true;

			cell = this.cells[x][y];
		}

		let cLen = cell.length;

		if (allowOne && cLen === 1)
			return false;
		else if (target.x === x && target.y === y)
			return true;

		for (let i = 0; i < cLen; i++) {
			let c = cell[i];
			//If we're first in the cell, we get preference
			if (c === obj)
				return false;
			else if (!c.aggro)
				continue;
			else if (c.aggro.hasAggroOn(target) || obj.aggro.hasAggroOn(c)) 
				return true;
		}

		return false;
	},

	setCollision: function (x, y, collides) {
		this.collisionMap[x][y] = collides ? 1 : 0;

		let grid = this.graph.grid;
		if (!grid[x][y]) 
			grid[x][y] = new pathfinder.gridNode(x, y, collides ? 0 : 1);
		else {
			grid[x][y].weight = collides ? 0 : 1;
			pathfinder.astar.cleanNode(grid[x][y]);
		}
	},

	isInPolygon: function (x, y, verts) {
		return this.ph.isInPolygon(...arguments);
	}
};

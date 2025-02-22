/*
	Todo:
		getClosestPos
*/

//System
const objects = require('../objects/objects');
const rustModules = require('../../rust-modules');

//Helpers
const mathRand = Math.random.bind(Math);

//Module
module.exports = {
	width: 0,
	height: 0,

	collisionMap: null,

	engine: null,

	init: function (collisionMap) {
		this.width = collisionMap.length;
		this.height = collisionMap[0].length;

		this.collisionMap = collisionMap;

		this.engine = new rustModules.physics.Physics(collisionMap, this.width, this.height);
	},

	addRegion: function (obj, fromX, fromY, fromWidth, fromHeight) {
		const idsOfCollidingObjects = this.engine.addRegion(obj, fromX, fromY, fromWidth, fromHeight);
		
		for (let id of idsOfCollidingObjects) {
			const f = objects.objects.find(o => o.id + '' === id);

			f.collisionEnter(obj);
			obj.collisionEnter(f);
		}
	},

	removeRegion: function (obj, toX, toY, toWidth, toHeight) {
		const idsOfCollidingObjects = this.engine.removeRegion(obj, toX, toY, toWidth, toHeight);

		for (let id of idsOfCollidingObjects) {
			const f = objects.objects.find(o => o.id + '' === id);

			f.collisionExit(obj);
			obj.collisionExit(f);
		}
	},

	addObject: function (obj, x, y, fromX, fromY) {
		const idsOfCollidingObjects = this.engine.beforeAddObject(x, y, fromX, fromY);

		for (let entry of idsOfCollidingObjects) {
			const [typeOfEvent, id] = entry.split('|');

			const checkObj = objects.objects.find(f => f.id + '' === id);

			// TODO: Ensure these can be ignored. Possible the object has already been deleted from the world
			if (!checkObj)
				continue;
			else if (typeOfEvent === 'enter') {
				if (checkObj.collisionEnter(obj)) 
					return;
			
				obj.collisionEnter(checkObj);
			} else if (typeOfEvent === 'stay') {
				checkObj.collisionStay(obj);
				obj.collisionStay(checkObj);
			}
		}

		this.engine.addObject(obj, x, y);

		return true;
	},

	removeObject: function (obj, x, y, toX, toY) {
		const idsOfCollidingObjects = this.engine.removeObject(obj, x, y, toX, toY);
		if (!idsOfCollidingObjects)
			return;

		for (let id of idsOfCollidingObjects) {
			const checkObj = objects.objects.find(f => f.id + '' === id);
			//If we can't find it, it means it's already been removed before physics knew about it
			if (!checkObj)
				continue;

			checkObj.collisionExit(obj); 
			obj.collisionExit(checkObj);
		}
	},

	isValid: function (x, y) {
		const { width, height, engine } = this;

		const isInvalid = (
			x === undefined || 
			y === undefined ||
			x < 0 ||
			x >= width ||
			y < 0 ||
			y >= height ||
			engine.doesCollide(x, y)
		);

		return !isInvalid;
	},

	getCell: function (x, y) {
		const idsOfObjects = this.engine.getCell(x, y);

		const res = [];
		idsOfObjects.forEach(id => {
			const obj = objects.objects.find(f => f.id + '' === id);

			if (obj !== undefined)
				res.push(obj);
		});

		return res;
	},

	getArea: function (x1, y1, x2, y2, filter) {
		const { width, height, engine } = this;

		const idsOfObjects = engine.getArea(
			Math.max(0, x1),
			Math.max(0, y1),
			Math.min(x2, width - 1),
			Math.min(y2, height - 1)
		);

		let res = idsOfObjects
			.map(id => objects.objects.find(f => f.id + '' === id))
			.filter(obj => obj !== undefined);

		if (filter)
			res = res.filter(f => filter(f));

		return res;
	},

	getOpenCellInArea: function (x1, y1, x2, y2) {
		const { width, height, engine } = this;

		const cellCoordinates = engine.getOpenCellInArea(
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
		const { width, height, engine } = this;

		const fromX = ~~from.x;
		const fromY = ~~from.y;

		if (fromX < 0 || fromX >= width || fromY < 0 || fromY >= height)
			return [];

		const fromCollides = engine.doesCollide(fromX, fromY);
		if (fromCollides)
			return [];

		if (!to) {
			to = {
				x: ~~(mathRand() * width),
				y: ~~(mathRand() * height)
			};
		}

		const toX = ~~to.x;
		const toY = ~~to.y;

		if (toX < 0 || toX >= width || toY < 0 || toY >= height)
			return [];

		const toCollides = engine.doesCollide(toX, toY);
		if (toCollides)
			return [];

		const path = engine.getPath(fromX, toX, fromY, toY);
		if (!path) 
			return [];

		return path;
	},

	isTileBlocking: function (x, y) {
		const { width, height, engine } = this;

		if (x < 0 || y < 0 || x >= width || y >= height)
			return true;

		x = ~~x;
		y = ~~y;

		return engine.doesCollide(x, y);
	},

	isCellOpen: function (x, y) {
		const { width, height } = this;

		if (x < 0 || y < 0 || x >= width || y >= height)
			return true;

		const cell = this.getCell(x, y);

		if (cell.length === 0)
			return true;

		//If the cell has contents but all of them are notices, we are still open
		const isBlocked = cell.some(obj => {
			return !obj.notice;
		});

		return !isBlocked;
	},

	hasLos: function (fromX, fromY, toX, toY) {
		return this.engine.hasLos(fromX, fromY, toX, toY);
	},

	getClosestPos: function (fromX, fromY, toX, toY, target, obj) {
		const { width, height, collisionMap } = this;

		const tried = {};

		const hasLos = this.hasLos.bind(this, toX, toY);
		const getCell = this.getCell.bind(this);

		const reverseX = (fromX > toX);
		const reverseY = (fromY > toY);

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
						let cell = getCell(i, j);
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

		if (!cell)
			cell = this.getCell(x, y);

		let cLen = cell.length;

		if (allowOne && cLen === 1)
			return false;
		else if (target.x === x && target.y === y)
			return true;

		for (let i = 0; i < cLen; i++) {
			let c = cell[i];
			//Perhaps it was removed
			if (!c)
				return;

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
		const collisionFlag = collides ? 1 : 0;

		this.engine.setCollision(x, y, collisionFlag);

		this.collisionMap[x][y] = collides;
	},

	isInPolygon: function (x, y, verts) {
		return this.engine.isInPolygon(x, y, verts);
	}
};

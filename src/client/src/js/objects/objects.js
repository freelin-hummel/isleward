import objBase from './objBase';
import events from '../system/events';
import renderer from '../rendering/renderer';
import config from '../config';

export default {
	objects: [],

	init () {
		events.on('onChangeHoverTile', this.getLocation.bind(this));

		[
			'onGetObject',
			'onTilesVisible',
			'onToggleNameplates',
			'destroyAllObjects'
		]
			.forEach(e => events.on(e, this[e].bind(this)));
	},

	getLocation (x, y) {
		let objects = this.objects;
		let oLen = objects.length;

		let closest = 999;
		let mob = null;
		for (let i = 0; i < oLen; i++) {
			let o = objects[i];

			if (!o.stats || o.nonSelectable || !o.sprite || !o.sprite.visible)
				continue;

			let dx = Math.abs(o.x - x);
			if ((dx < 3) && (dx < closest)) {
				let dy = Math.abs(o.y - y);
				if ((dy < 3) && (dy < closest)) {
					mob = o;
					closest = Math.max(dx, dy);
				}
			}
		}

		events.emit('onMobHover', mob);
	},

	/*
		objSeeker: (object)
			The object trying to find a target
		maxDistance: (integer)
			How far away an object can be to still be considered
		findHostile: (boolean)
			When true, only consider objects that objSeeker can attack
			When false, only consider objects that objSeeker can heal
	*/
	getClosest (objSeeker, maxDistance, findHostile, fromObj) {
		if (!objSeeker?.aggro)
			return null;

		const { x, y, aggro: { faction, subFaction } } = objSeeker;

		let list = this.objects.filter(o => {
			const { aggro: oAggro } = o;

			if (!oAggro)
				return false;

			const sameFaction = (
				faction === oAggro.faction &&
				subFaction === oAggro.subFaction
			);

			if (
				!o.stats ||
				o.nonSelectable ||
				!o.sprite?.visible ||
				findHostile === sameFaction
			)
				return false;

			const dx = Math.abs(o.x - x);
			if (dx < maxDistance) {
				const dy = Math.abs(o.y - y);
				if (dy < maxDistance)
					return true;
			}
		});

		if (list.length === 0)
			return null;

		list.sort((a, b) => {
			let aDistance = Math.max(Math.abs(x - a.x), Math.abs(y - a.y));
			let bDistance = Math.max(Math.abs(x - b.x), Math.abs(y - b.y));

			return (aDistance - bDistance);
		});

		if (!fromObj)
			return list[0];

		let fromIndex = list.findIndex(l => l.id === fromObj.id);
		fromIndex = (fromIndex + 1) % list.length;

		return list[fromIndex];
	},

	destroyAllObjects () {
		this.objects.forEach(o => {
			o.destroy();
		});

		this.objects.length = 0;

		window?.player?.offEvents();
	},

	onGetObject (obj) {
		//Things like attacks don't have ids
		let exists = null;
		if (_.has(obj, 'id'))
			exists = this.objects.find(({ id, destroyed }) => id === obj.id && !destroyed);

		if (!exists)
			exists = this.buildObject(obj);
		else
			this.updateObject(exists, obj);
	},

	buildObject (template) {
		let obj = $.extend(true, {}, objBase);

		let components = template.components || [];
		delete template.components;

		let syncTypes = ['portrait', 'area'];

		for (let p in template) {
			let value = template[p];
			let type = typeof (value);

			if (type === 'object') {
				if (syncTypes.indexOf(p) > -1)
					obj[p] = value;
			} else
				obj[p] = value;
		}

		if (obj.sheetName)
			obj.sprite = renderer.buildObject(obj);

		if (obj.name && obj.sprite) {
			obj.nameSprite = renderer.buildText({
				layerName: 'effects',
				text: obj.name,
				x: (obj.x * scale) + (scale / 2),
				y: (obj.y * scale) + scale
			});
		}

		if (template.filters && obj.sprite)
			renderer.addFilter(obj.sprite, template.filters[0]);

		//We need to set visibility before components kick in as they sometimes need access to isVisible
		obj.updateVisibility();

		components.forEach(c => {
			//Map ids to objects
			let keys = Object.keys(c).filter(k => {
				return (k.indexOf('id') === 0 && k.length > 2);
			});
			keys.forEach(k => {
				let value = c[k];
				let newKey = k.substr(2, k.length).toLowerCase();

				c[newKey] = this.objects.find(o => o.id === value);
				delete c[k];
			});

			obj.addComponent(c.type, c);
		});

		if (obj.self) {
			window.player = obj;
			events.emit('onGetPlayer', obj);

			renderer.setPosition({
				centerOnObject: obj,
				instant: true
			});
		}

		this.objects.push(obj);

		return obj;
	},

	updateObject (obj, template) {
		let components = template.components || [];

		components.forEach(c => {
			//Map ids to objects
			let keys = Object.keys(c).filter(k => {
				return (k.indexOf('id') === 0 && k.length > 2);
			});
			keys.forEach(k => {
				let value = c[k];
				let newKey = k.substr(2, k.length).toLowerCase();

				c[newKey] = this.objects.find(o => o.id === value);
				delete c[k];
			});

			obj.addComponent(c.type, c);
		});

		delete template.components;

		if (template.removeComponents) {
			template.removeComponents.forEach(r => {
				obj.removeComponent(r);
			});
			delete template.removeComponents;
		}

		let oldX = obj.x;

		let sprite = obj.sprite;
		for (let p in template) {
			let value = template[p];
			let type = typeof (value);

			if (type !== 'object')
				obj[p] = value;

			if (p === 'casting') {
				if (obj === window.player)
					events.emit('onGetSelfCasting', value);
				else
					events.emit('onGetTargetCasting', obj.id, value);
			}

			if (sprite) {
				if (p === 'x') {
					if (obj.x < oldX)
						obj.flipX = true;
					else if (obj.x > oldX)
						obj.flipX = false;
				}
			}
		}

		if (((template.sheetName) || (template.cell)) && (sprite))
			renderer.setSprite(obj);

		if ((!obj.sprite) && (template.sheetName))
			obj.sprite = renderer.buildObject(obj);

		if (template.filters && !obj.sprite?.filters?.length)
			renderer.addFilter(obj.sprite, template.filters[0]);
		else if (template.filters && template.filters.length === 0 && obj.sprite?.filters?.length > 0)
			renderer.removeFilter(obj.sprite);

		if (template.name) {
			if (obj.nameSprite)
				renderer.destroyObject({ sprite: obj.nameSprite });

			obj.nameSprite = renderer.buildText({
				layerName: 'effects',
				text: template.name,
				x: (obj.x * scale) + (scale / 2),
				y: (obj.y * scale) + scale
			});

			obj.nameSprite.visible = config.get('showNames');
		}

		if ((template.x !== 0) || (template.y !== 0)) {
			obj.updateVisibility();
			obj.setSpritePosition();

			if (obj.stats)
				obj.stats.updateBars();
		}
	},

	update () {
		let objects = this.objects;
		let len = objects.length;

		for (let i = 0; i < len; i++) {
			let o = objects[i];

			if (o.isNew)
				delete o.isNew;

			if (o.destroyed) {
				o.destroy();
				objects.splice(i, 1);
				i--;
				len--;
				continue;
			}

			o.update();
		}
	},

	onTilesVisible (tiles) {
		let objects = this.objects;
		let oLen = objects.length;
		for (let i = 0; i < oLen; i++) {
			let o = objects[i];

			let onPos = tiles.some(t => {
				return (!(t.x !== o.x || t.y !== o.y));
			});
			if (!onPos)
				continue;

			o.updateVisibility();
		}
	},

	onToggleNameplates (show) {
		let objects = this.objects;
		let oLen = objects.length;
		for (let i = 0; i < oLen; i++) {
			let obj = objects[i];
			let ns = obj.nameSprite;
			if ((!ns) || (obj.dead) || ((obj.sprite) && (!obj.sprite.visible)))
				continue;

			ns.visible = show;
		}
	},

	recalcVisibility () {
		let objects = this.objects;
		for (let i = 0; i < this.objects.length; i++) {
			const obj = objects[i];
			if (!obj.sprite)
				continue;

			obj.updateVisibility();
		}
	}
};

import client from '../system/client';
import renderer from '../rendering/renderer';
import events from '../system/events';
import input from '../input';
import objects from '../objects/objects';

export default {
	type: 'spellbook',

	hoverTarget: null,
	target: null,
	targetSprite: null,

	reticleState: 0,
	reticleCd: 0,
	reticleCdMax: 10,
	reticleSprite: null,

	groundTargetSpell: false,

	init () {
		this.targetSprite = renderer.buildObject({
			sheetName: 'ui',
			layerName: 'effects',
			cell: 0,
			visible: false
		});

		this.reticleSprite = renderer.buildObject({
			sheetName: 'ui',
			layerName: 'effects',
			cell: 8,
			visible: false
		});

		events.emit('onGetSpells', this.spells);

		this.reticleCd = this.reticleCdMax;

		this.obj.on('onDeath', this.onDeath.bind(this));
		this.obj.on('onMobHover', this.onMobHover.bind(this));
		this.obj.on('mouseDown', this.onMouseDown.bind(this));
		this.obj.on('onKeyDown', this.onKeyDown.bind(this));
	},

	extend (blueprint) {
		if (blueprint.removeSpells) {
			blueprint.removeSpells.forEach(r => _.spliceWhere(this.spells, s => s.id === r));
			events.emit('onGetSpells', this.spells);
		}

		if (blueprint.getSpells) {
			blueprint.getSpells.forEach(function (s) {
				let existIndex = this.spells.findIndex(f => f.id === s.id);

				if (existIndex > -1) {
					this.spells.splice(existIndex, 1, s);

					return;
				}

				this.spells.push(s);
				this.spells.sort((a, b) => a.id - b.id);
			}, this);

			events.emit('onGetSpells', this.spells);
		}
	},

	getSpell (number) {
		let spellNumber = (number === ' ') ? 0 : number;
		let spell = this.spells.find(s => s.id === spellNumber);

		return spell;
	},

	onMobHover (target) {
		this.hoverTarget = target;
	},

	onMouseDown (e, target) {
		if (isMobile && this.groundTargetSpell) {
			this.groundTarget = {
				x: ~~(e.worldX / scale),
				y: ~~(e.worldY / scale)
			};

			this.onKeyDown(this.groundTargetSpell);

			this.groundTargetSpell = null;
		}

		if (!target && this.target && (!this.hoverTarget || this.hoverTarget.id !== this.target.id)) {
			client.request({
				cpn: 'player',
				method: 'castSpell',
				data: {
					priority: true,
					target: null
				}
			});
		}

		this.target = target || this.hoverTarget;

		if (this.target) {
			this.targetSprite.x = this.target.x * scale;
			this.targetSprite.y = this.target.y * scale;

			this.targetSprite.visible = true;
		} else
			this.targetSprite.visible = false;

		events.emit('onSetTarget', this.target, e);
	},

	tabTarget (ignoreIfSet) {
		let compareAgainst = ignoreIfSet ? null : this.target;

		let closest = objects.getClosest(window.player.x, window.player.y, 10, input.isKeyDown('shift'), compareAgainst);

		this.target = closest;
		this.targetSprite.visible = !!this.target;

		events.emit('onSetTarget', this.target, null);
	},

	onKeyDown (key) {
		if (key === 'tab') {
			this.tabTarget();

			return;
		} else if (isNaN(key))
			return;

		let spell = this.getSpell(~~key);
		if (!spell)
			return;

		let isShiftDown = input.isKeyDown('shift');

		let oldTarget = null;
		if (isShiftDown || spell.targetPlayerPos) {
			oldTarget = this.target;
			this.target = this.obj;
		}

		if (!spell.aura && !spell.targetGround && !spell.autoTargetFollower && !this.target)
			return;

		let hoverTile = this.groundTarget || (this.obj.mouseMover || this.obj.touchMover).hoverTile;
		let target = hoverTile;
		if (spell.autoTargetFollower && !this.target)
			target = null;
		else if (!spell.targetGround && this.target)
			target = this.target.id;
		else if (spell.targetPlayerPos)
			isShiftDown = true;

		if (isShiftDown)
			this.target = oldTarget;

		if (target === this.obj && spell.noTargetSelf)
			return;
		else if (isMobile && spell.targetGround && !spell.targetPlayerPos && !this.groundTarget) {
			if (this.groundTargetSpell === key) {
				this.groundTargetSpell = null;

				events.emit('onGetAnnouncement', { msg: `Cancelled casting ${spell.name}` });

				return;
			}

			this.groundTargetSpell = key;

			events.emit('onGetAnnouncement', { msg: `Pick a location to cast ${spell.name}` });

			return;
		}

		client.request({
			cpn: 'player',
			method: 'castSpell',
			data: {
				priority: input.isKeyDown('ctrl'),
				spell: spell.id,
				target,
				self: isShiftDown
			}
		});

		if (isMobile)
			this.groundTarget = null;
	},

	onDeath () {
		this.target = null;
		this.targetSprite.visible = false;
	},

	update () {
		if (this.reticleCd > 0)
			this.reticleCd--;
		else {
			this.reticleCd = this.reticleCdMax;
			this.reticleState++;
			if (this.reticleState === 4)
				this.reticleState = 0;
		}

		let target = this.target;
		if (!target)
			return;

		if (this.target.destroyed || this.target.nonSelectable || !this.target.isVisible) {
			this.target = null;
			this.targetSprite.visible = false;
		}

		this.targetSprite.x = target.x * scale;
		this.targetSprite.y = target.y * scale;

		renderer.setSprite({
			sprite: this.targetSprite,
			cell: this.reticleState,
			sheetName: 'ui'
		});
	},

	destroy () {
		if (this.targetSprite) {
			renderer.destroyObject({
				layerName: 'effects',
				sprite: this.targetSprite
			});
		}
	}
};

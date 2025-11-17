import globals from '../../../../js/system/globals';
import stringifyStatValue from './stringifyStatValue';

let item = null;
let compare = null;
let shiftDown = null;
let equipErrors = null;

const lineBuilders = {
	div: (className, children) => {
		if (!children)
			return null;

		if (children.join)
			children = children.join('');

		if (!children.length)
			return null;

		return `<div class="${className}">${children}</div>`;
	},

	name: () => {
		let quantity = '';
		if (item.quantity > 1)
			quantity = `<div class="quantity">(${item.quantity})</div>`;

		return `<div class="name q${item.quality}">${item.name}${quantity}</div>`;
	},

	slot: () => {
		if (!item.slot)
			return null;

		const { clientConfig: { slotTranslations } } = globals;

		const res = slotTranslations[item.slot] ?? slotTranslations.unknown;

		return res;
	},

	power: () => {
		let res = '';

		if (item.infused)
			res += '<div class="infused">Infused</div>';

		if (item.power)
			res += `Augmented${item.power > 1 ? ` x${item.power}` : ''}`;

		return res;
	},

	implicitStats: () => {
		const { clientConfig: { statTranslations } } = globals;

		if (!item.implicitStats)
			return null;

		const tempImplicitStats = $.extend(true, [], item.implicitStats);

		if (compare && shiftDown && !item.eq) {
			const compareImplicitStats = (compare.implicitStats || []);

			tempImplicitStats.forEach(s => {
				const { stat, value } = s;

				const f = compareImplicitStats.find(c => c.stat === stat);

				if (!f) {
					s.value = `+${value}`;

					return;
				}

				const delta = value - f.value;
				if (delta > 0)
					s.value = `+${delta}`;
				else if (delta < 0)
					s.value = delta;
			});

			compareImplicitStats.forEach(s => {
				if (tempImplicitStats.some(f => f.stat === s.stat))
					return;

				tempImplicitStats.push({
					stat: s.stat,
					value: -s.value
				});
			});
		}

		const html = tempImplicitStats
			.map(({ stat, value }) => {
				const statName = statTranslations[stat];

				let prettyValue = stringifyStatValue(stat, value);

				let rowClass = '';

				if (compare && shiftDown) {
					if (prettyValue.indexOf('-') > -1)
						rowClass = 'loseStat';
					else if (prettyValue.indexOf('+') > -1)
						rowClass = 'gainStat';
				} else
					prettyValue = `+${prettyValue}`;

				return `<div class="${rowClass}">${prettyValue} ${statName}</div>`;
			})
			.join('');

		const result = (
			lineBuilders.div('smallSpace', ' ') +
			lineBuilders.div('line', ' ') +
			lineBuilders.div('smallSpace', ' ') +
			html
		);

		return result;
	},

	stats: () => {
		const { clientConfig: { statTranslations } } = globals;

		const tempStats = $.extend(true, {}, item.stats);
		const enchantedStats = item.enchantedStats ?? {};
		const infusedStats = item.infusedStats ?? {};

		if (compare && shiftDown) {
			if (!item.eq) {
				const compareStats = compare.stats;
				for (let s in tempStats) {
					if (compareStats[s]) {
						const delta = tempStats[s] - compareStats[s];
						if (delta > 0)
							tempStats[s] = '+' + delta;
						else if (delta < 0)
							tempStats[s] = delta;
					} else
						tempStats[s] = '+' + tempStats[s];
				}
				for (let s in compareStats) {
					if (!tempStats[s])
						tempStats[s] = -compareStats[s];
				}
			}
		} else {
			Object.keys(tempStats).forEach(s => {
				if (enchantedStats[s]) {
					tempStats[s] -= enchantedStats[s];
					if (tempStats[s] <= 0)
						delete tempStats[s];

					tempStats['_' + s] = `+${enchantedStats[s]}`;
				}

				if (infusedStats[s]) {
					tempStats['_' + s] -= infusedStats[s];
					if (tempStats['_' + s] <= 0)
						delete tempStats['_' + s];

					tempStats['~' + s] = `+${infusedStats[s]}`;
				}
			});
		}

		const html = Object.keys(tempStats)
			.map(s => {
				const isEnchanted = (s[0] === '_');
				let statName = s;
				if (isEnchanted)
					statName = statName.substr(1);

				const isInfused = (s[0] === '~');
				if (isInfused)
					statName = statName.substr(1);

				let prettyValue = stringifyStatValue(statName, tempStats[s]);
				statName = statTranslations[statName];

				let rowClass = '';

				if (compare && shiftDown) {
					if (prettyValue.indexOf('-') > -1)
						rowClass = 'loseStat';
					else if (prettyValue.indexOf('+') > -1)
						rowClass = 'gainStat';
				} else if (prettyValue[0] !== '+')
					prettyValue = '+' + prettyValue;
				if (isEnchanted)
					rowClass += ' enchanted';
				if (isInfused)
					rowClass += ' infused';

				return `<div class="${rowClass}">${prettyValue} ${statName}</div>`;
			})
			.sort((a, b) => {
				return (a.replace(' enchanted', '').length - b.replace(' enchanted', '').length);
			})
			.sort((a, b) => {
				const getType = row => {
					if (row.includes('enchanted'))
						return 3;
					if (row.includes('infused'))
						return 2;

					return 1;
				};

				return getType(a) - getType(b);
			})
			.join('');

		if (!html)
			return null;

		const result = (
			lineBuilders.div('smallSpace', ' ') +
			lineBuilders.div('line', ' ') +
			lineBuilders.div('smallSpace', ' ') +
			html
		);

		return result;
	},

	effects: () => {
		if (!item.effects || !item.effects.length || !item.effects[0].text || item.type === 'mtx')
			return null;

		let html = '';

		item.effects.forEach((e, i) => {
			html += e.text;
			if (i < item.effects.length - 1)
				html += '<br />';
		});

		const result = (
			lineBuilders.div('space', ' ') +
			(item.spell?.values ? lineBuilders.div('line', ' ') + lineBuilders.div('space', ' ') : '') +
			html
		);

		return result;
	},

	material: () => {
		if (item.material)
			return 'Crafting Material';
	},

	quest: () => {
		if (item.quest)
			return 'Quest Item';
	},

	spellName: config => {
		if (!item.spell || item.ability)
			return null;

		let res = lineBuilders.div(`spellName q${item.spell.quality}`, item.spell.name);

		if (config?.lineAbove !== false) {
			res = (
				lineBuilders.div('space', ' ') +
				lineBuilders.div('line', ' ') +
				lineBuilders.div('smallSpace', ' ') +
				res
			);
		}

		return res;
	},

	spellTags: () => {
		if (!item.spell)
			return null;

		const { clientConfig: { spells } } = globals;

		const spell = spells.find(f => f.name === item.spell.name);

		if (!spell)
			return null;

		const tagsArray = [];

		if (spell.isAttack === true)
			tagsArray.push('Attack');
		else if (spell.isAttack === false)
			tagsArray.push('Spell');

		if (spell.isAoe === true)
			tagsArray.push('AoE');

		if (spell.isAura === true)
			tagsArray.push('Aura');

		if (spell.isBuff === true)
			tagsArray.push('Buff');

		if (Object.keys(item.spell.values).some(f => f.toLowerCase().includes('duration')))
			tagsArray.push('Duration');

		if (spell.isHeal === true)
			tagsArray.push('Heal');

		if (spell.isMinion === true)
			tagsArray.push('Minion');

		if (spell.isMovement === true)
			tagsArray.push('Movement');

		if (spell.isAttack !== undefined) {
			if (spell.element)
				tagsArray.push(spell.element[0].toUpperCase() + spell.element.substr(1));
			else
				tagsArray.push('Physical');
		}

		return (
			lineBuilders.div('spellTags', `(${tagsArray.join(', ')})`)
		);
	},

	spellDescription: () => {
		if (!item.spell)
			return null;

		const { clientConfig: { spells } } = globals;

		const spell = spells.find(f => f.name === item.spell.name);

		if (!spell)
			return null;

		return (
			lineBuilders.div('smallSpace', ' ') +
			lineBuilders.div('line', ' ') +
			lineBuilders.div('smallSpace', ' ') +
			lineBuilders.div('spellDescription', spell.description)
		);
	},

	spellCost: () => {
		if (!item.spell || item.slot)
			return null;

		const { clientConfig: { spells } } = globals;

		const spell = spells.find(f => f.name === item.spell.name);

		if (!spell)
			return null;

		return (
			lineBuilders.div('smallSpace', ' ') +
			lineBuilders.div('line', ' ') +
			lineBuilders.div('smallSpace', ' ') +
			lineBuilders.div('spellCost spellInfo', `Cost:&nbsp;<span class='number'>${spell.manaCost} Mana</span>`)
		);
	},

	spellCastTime: () => {
		if (!item.spell || item.slot)
			return null;

		const { clientConfig: { spells } } = globals;

		const spell = spells.find(f => f.name === item.spell.name);

		if (!spell)
			return null;

		const castTime = !spell.castTime ? 'Instant' : `${spell.castTime} Ticks`;

		return (
			lineBuilders.div('spellCastTime spellInfo', `Cast Time:&nbsp;<span class='number'>${castTime}</span>`)
		);
	},

	spellCooldown: () => {
		if (!item.spell)
			return null;

		const { clientConfig: { spells } } = globals;

		const spell = spells.find(f => f.name === item.spell.name);

		if (!spell || !spell.cooldown)
			return null;

		//We can pass in either an item or an equiped rune
		const cooldown = item.spell.cdMax ?? spell.cooldown;

		return (
			lineBuilders.div('spellCooldown spellInfo', `Cooldown:&nbsp;<span class='number'>${cooldown} Ticks</span>`)
		);
	},

	spellRange: () => {
		if (!item.spell)
			return null;

		const { clientConfig: { spells } } = globals;

		const spell = spells.find(f => f.name === item.spell.name);

		if (!spell)
			return;

		//We can pass in either an item or an equiped rune
		const range = item.range ?? item.spell.range ?? spell.range;

		const renderRange = (
			spell &&
			(
				range ||
				(
					item.slot === 'oneHanded' ||
					item.slot === 'twoHanded'
				)
			)
		);

		if (!renderRange)
			return;

		const useRange = range ?? 1;

		return (
			lineBuilders.div('spellRange spellInfo', `Range:&nbsp;<span class='number'>${useRange} Tile${range > 1 ? 's' : ''}</span>`)
		);
	},

	typeAndSlot: () => {
		if (!item.slot && !item.type)
			return null;

		if (!item.slot) {
			const type = item.type[0].toUpperCase() + item.type.substring(1);

			return `<div class="typeAndSlot">${type}</div>`;
		} else if (!item.type)
			return `<div class="typeAndSlot">${item.slot}</div>`;

		const { clientConfig: { slotTranslations } } = globals;

		const slotInfo = slotTranslations[item.slot] ?? slotTranslations.unknown;

		return `<div class="typeAndSlot"><div>${slotInfo}</div><div>${item.type}</div></div>`;
	},

	spellRolls: () => {
		if (!item.spell || !item.spell.values)
			return null;

		const entries = Object.entries(item.spell.values);

		if (entries.length === 0)
			return;

		const { clientConfig: { statTranslations } } = globals;

		const abilityValues = entries
			.map(([k, v]) => {
				const translatedStat = statTranslations.runeStats[item.spell.name.toLowerCase()]?.[k] ?? statTranslations[k] ?? k;

				const isPercent = translatedStat.toLowerCase().includes('(percent)');
				const isTicks = translatedStat.toLowerCase().includes('(ticks)');
				const isPerTick = translatedStat.toLowerCase().includes('(per tick)');
				const isTiles = translatedStat.toLowerCase().includes('(tiles)');

				let delta = v;

				const key = translatedStat
					.replace('(Ticks)', '')
					.replace('(Percent)', '')
					.replace('(Tiles)', '')
					.replace('(Per Tick)', '');

				if (!compare || !shiftDown) {
					let value = delta;
					if (isPercent)
						value += '%';
					if (isTicks)
						value += ` ${delta > 1 ? 'Ticks' : 'Tick'}`;
					if (isTiles)
						value += ` ${delta > 1 ? 'Tiles' : 'Tile'}`;
					if (isPerTick)
						value += ' per Tick';

					return `${key}: ${value}<br/>`;
				}

				delta = v - compare.spell.values[k];
				// adjust by EPSILON to handle float point imprecision, otherwise 3.15 - 2 = 1.14 or 2 - 3.15 = -1.14
				// have to move away from zero by EPSILON, not a simple add
				if (delta >= 0)
					delta += Number.EPSILON;
				else
					delta -= Number.EPSILON;
				delta = ~~((delta) * 100) / 100;

				let rowClass = '';
				if (delta > 0) {
					rowClass = 'gainDamage';
					delta = '+' + delta;
				} else if (delta < 0)
					rowClass = 'loseDamage';

				let deltaValue = delta;
				if (isPercent)
					deltaValue += '%';
				if (isTicks)
					deltaValue += ` ${delta > 1 ? 'Ticks' : 'Tick'}`;
				if (isTiles)
					deltaValue += ` ${delta > 1 ? 'Tiles' : 'Tile'}`;
				if (isPerTick)
					deltaValue += ' per Tick';

				return `<div class="${rowClass}">${key}: ${deltaValue}</div>`;
			})
			.join('');

		const res = (
			lineBuilders.div('smallSpace', ' ') +
			lineBuilders.div('line', ' ') +
			lineBuilders.div('smallSpace', ' ') +
			lineBuilders.div('spellRolls', abilityValues)
		);

		return res;
	},

	requires: className => {
		if (!item.requires && !item.level && (!item.factions || !item.factions.length))
			return null;

		if (equipErrors.length)
			className += ' high-level';

		let res = (
			lineBuilders.div('smallSpace', ' ') +
			lineBuilders.div('line', ' ') +
			lineBuilders.div('smallSpace', ' ') +
			lineBuilders.div(className, 'Requires')
		);

		return res;
	},

	requireLevel: className => {
		if (!item.level)
			return null;

		if (equipErrors.includes('level'))
			className += ' high-level';

		const level = item.level.push ? `${item.level[0]} - ${item.level[1]}` : item.level;

		return lineBuilders.div(className, `Level: ${level}`);
	},

	requireStats: className => {
		if (!item.requires || !item.requires[0])
			return null;

		const { clientConfig: { statTranslations } } = globals;

		if (equipErrors.includes('stats'))
			className += ' high-level';

		const translatedStat = statTranslations[item.requires[0].stat];

		let html = `${translatedStat}: ${item.requires[0].value}`;

		return lineBuilders.div(className, html);
	},

	requireFaction: () => {
		if (!item.factions)
			return null;

		let htmlFactions = '';

		item.factions.forEach((f, i) => {
			let htmlF = f.name + ': ' + f.tierName;
			if (f.tier > window.player.reputation.getTier(f.id))
				htmlF = '<font class="color-red">' + htmlF + '</font>';

			htmlFactions += htmlF;
			if (i < item.factions.length - 1)
				htmlFactions += '<br />';
		});

		return htmlFactions;
	},

	worth: () => {
		if (!item.worthText)
			return null;

		return (
			lineBuilders.div('space', ' ') +
			`<span class="worth">Price: ${item.worthText}</span>`
		);
	},

	info: () => {
		if (!item.slot)
			return null;

		let text = null;

		if (isMobile) {
			if (compare && !shiftDown)
				text = 'Tap again to compare';
		} else if (!shiftDown && compare)
			text = 'Hold [shift] to compare';

		if (!text)
			return null;

		return (
			lineBuilders.div('space', ' ') +
				text
		);
	},

	description: () => {
		if (!item.description)
			return null;

		return (
			lineBuilders.div('space', ' ') +
			lineBuilders.div('line', ' ') +
			lineBuilders.div('space', ' ') +
			item.description
		);
	},

	cd: () => {
		if (!item.cd)
			return null;

		return `cooldown: ${item.cd}`;
	},

	uses: () => {
		if (!item.uses)
			return null;

		return `uses: ${item.uses}`;
	}
};

const originalBuilders = {};
Object.entries(lineBuilders).forEach(([type, builder]) => {
	originalBuilders[type] = builder;
});

const init = (_item, _compare, _shiftDown, _equipErrors, _customLineBuilders) => {
	item = _item;
	compare = _compare;
	shiftDown = _shiftDown;
	equipErrors = _equipErrors;

	Object.keys(originalBuilders).forEach(k => {
		const useBuilder = _customLineBuilders[k] !== undefined ?
			_customLineBuilders[k].bind(null, item, originalBuilders[k]) :
			originalBuilders[k];

		lineBuilders[k] = useBuilder;
	});

	Object.keys(_customLineBuilders).forEach(k => {
		if (!originalBuilders[k])
			lineBuilders[k] = _customLineBuilders[k].bind(null, item);
	});
};

export default {
	init,
	lineBuilders
};

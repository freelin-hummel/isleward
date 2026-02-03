/* eslint-disable no-inline-comments */
/* eslint-disable max-lines-per-function */

//Helpers
const abs = v => {
	if (v < 0)
		return -v;

	return v;
};

const getDims = o => {
	const s = o.size;
	if (!s)
		return { w: 1, h: 1 };

	return {
		w: s.width || 1,
		h: s.height || 1
	};
};

// Origin is bottom-middle when size exists, else 1x1 at x,y.
// Returns inclusive bounds.
const getBounds = (x, y, w, h) => {
	const halfW = (w / 2) | 0;

	const minX = x - halfW;
	const maxX = minX + w - 1;

	const maxY = y;
	const minY = y - h + 1;

	return { minX, maxX, minY, maxY };
};

const rectChebyshevDistance = (a, b) => {
	let dx = 0;
	if (a.maxX < b.minX)
		dx = b.minX - a.maxX;
	else if (b.maxX < a.minX)
		dx = a.minX - b.maxX;

	let dy = 0;
	if (a.maxY < b.minY)
		dy = b.minY - a.maxY;
	else if (b.maxY < a.minY)
		dy = a.minY - b.maxY;

	if (dx > dy)
		return dx;

	return dy;
};

// Check all tiles the mover would occupy at the candidate origin
const isFootprintBlocking = (physics, originX, originY, w, h) => {
	const b = getBounds(originX, originY, w, h);

	for (let x = b.minX; x <= b.maxX; x++) {
		for (let y = b.minY; y <= b.maxY; y++) {
			if (physics.isTileBlocking(x, y))
				return true;
		}
	}

	return false;
};

//Object Extensions
const objDistanceChecks = {
	getDistanceTo: function (target) {
		const ax = this.x;
		const ay = this.y;

		const bx = target.x;
		const by = target.y;

		const as = this.size;
		const bs = target.size;

		let dx = 0;
		let dy = 0;

		// Fast path: both are 1x1
		if (!as && !bs) {
			dx = ax - bx;
			if (dx < 0)
				dx = -dx;

			dy = ay - by;
			if (dy < 0)
				dy = -dy;

			if (dx > dy)
				return dx;

			return dy;
		}

		const aw = as ? as.width : 1;
		const ah = as ? as.height : 1;

		const bw = bs ? bs.width : 1;
		const bh = bs ? bs.height : 1;

		const aHalfW = (aw / 2) | 0;
		const bHalfW = (bw / 2) | 0;

		const aMinX = ax - aHalfW;
		const aMaxX = aMinX + aw - 1;
		const aMaxY = ay;
		const aMinY = ay - ah + 1;

		const bMinX = bx - bHalfW;
		const bMaxX = bMinX + bw - 1;
		const bMaxY = by;
		const bMinY = by - bh + 1;

		if (aMaxX < bMinX)
			dx = bMinX - aMaxX;
		else if (bMaxX < aMinX)
			dx = aMinX - bMaxX;

		if (aMaxY < bMinY)
			dy = bMinY - aMaxY;
		else if (bMaxY < aMinY)
			dy = aMinY - bMaxY;

		return (dx > dy) ? dx : dy;
	},

	getClosestNonBlockingPositionFrom: function (fromObj, distance = 1) {
		const { physics } = this.instance;

		// --- setup ---
		const targetDims = getDims(this);
		const moverDims = getDims(fromObj);

		const targetBounds = getBounds(this.x, this.y, targetDims.w, targetDims.h);

		// Determine preferred approach direction based on origin positions
		const relX = this.x - fromObj.x;
		const relY = this.y - fromObj.y;

		let preferX = 0;
		let preferY = 0;

		const absX = abs(relX);
		const absY = abs(relY);

		if (absX > absY) {
			if (relX > 0)
				preferX = -1; // from left -> stand on left side of target
			else if (relX < 0)
				preferX = 1; // from right
		} else if (absY > absX) {
			if (relY > 0)
				preferY = -1; // from above -> stand above
			else if (relY < 0)
				preferY = 1; // from below
		} else {
		// diagonal or same tile
			if (relX > 0)
				preferX = -1;
			else if (relX < 0)
				preferX = 1;

			if (relY > 0)
				preferY = -1;
			else if (relY < 0)
				preferY = 1;
		}

		// Candidate bands are generated in minX/minY space (top-left of mover bounds)
		const moverHalfW = (moverDims.w / 2) | 0;

		// Convert mover minX/minY to mover origin (bottom-middle)
		const minToOrigin = (minX, minY) => {
			return {
				x: minX + moverHalfW,
				y: minY + moverDims.h - 1
			};
		};

		// Build candidate list with a small score, pick best
		let best = null;
		let bestPenalty = 999999999;
		let bestDist = 999999999;
		let bestDistMan = 999999999;

		const considerCandidateMin = (minX, minY) => {
			const pos = minToOrigin(minX, minY);
			const moverBounds = getBounds(pos.x, pos.y, moverDims.w, moverDims.h);

			const d = rectChebyshevDistance(targetBounds, moverBounds);
			if (d !== distance)
				return;

			// Must not be blocked (check full footprint)
			if (isFootprintBlocking(physics, pos.x, pos.y, moverDims.w, moverDims.h))
				return;

			// Must be visible from target (use target origin as LOS source)
			if (!physics.hasLos(this.x, this.y, pos.x, pos.y))
				return;

			// Side classification relative to target
			let sideX = 0;
			let sideY = 0;

			if (moverBounds.maxX < targetBounds.minX)
				sideX = -1;
			else if (moverBounds.minX > targetBounds.maxX)
				sideX = 1;

			if (moverBounds.maxY < targetBounds.minY)
				sideY = -1;
			else if (moverBounds.minY > targetBounds.maxY)
				sideY = 1;

			// Penalty: prefer matching approach side(s)
			let penalty = 0;

			if (preferX !== 0 && sideX !== preferX)
				penalty++;

			if (preferY !== 0 && sideY !== preferY)
				penalty++;

			// Secondary: closer to fromObj origin
			let distFrom = pos.x - fromObj.x;
			if (distFrom < 0)
				distFrom = -distFrom;

			let distFromY = pos.y - fromObj.y;
			if (distFromY < 0)
				distFromY = -distFromY;

			let distCheb = distFrom;
			let distMan = distFrom + distFromY;

			if (distFromY > distCheb)
				distCheb = distFromY;

			if (penalty < bestPenalty) {
				bestPenalty = penalty;
				bestDist = distCheb;
				bestDistMan = distMan;
				best = pos;
				return;
			}

			if (penalty === bestPenalty) {
				if (distCheb < bestDist) {
					bestDist = distCheb;
					bestDistMan = distMan;
					best = pos;
					return;
				}

				if (distCheb === bestDist) {
					if (distMan < bestDistMan) {
						bestDistMan = distMan;
						best = pos;
					}
				}
			}
		};

		// --- generate candidate bands around target bounds ---
		// These are ranges for mover's minX/minY such that the OTHER axis gap can be <= distance.
		const minYRangeLow = targetBounds.minY - distance - moverDims.h + 1;
		const minYRangeHigh = targetBounds.maxY + distance;

		const minXRangeLow = targetBounds.minX - distance - moverDims.w + 1;
		const minXRangeHigh = targetBounds.maxX + distance;

		// Right band: mover minX fixed so its minX is target.maxX + distance
		{
			const minX = targetBounds.maxX + distance;
			for (let minY = minYRangeLow; minY <= minYRangeHigh; minY++) 
				considerCandidateMin(minX, minY);
		}

		// Left band: mover maxX is target.minX - distance => minX = (target.minX - distance) - (w - 1)
		{
			const minX = (targetBounds.minX - distance) - (moverDims.w - 1);
			for (let minY = minYRangeLow; minY <= minYRangeHigh; minY++) 
				considerCandidateMin(minX, minY);
		}

		// Bottom band: mover minY fixed so its minY is target.maxY + distance
		{
			const minY = targetBounds.maxY + distance;
			for (let minX = minXRangeLow; minX <= minXRangeHigh; minX++) 
				considerCandidateMin(minX, minY);
		}

		// Top band: mover maxY is target.minY - distance => minY = (target.minY - distance) - (h - 1)
		{
			const minY = (targetBounds.minY - distance) - (moverDims.h - 1);
			for (let minX = minXRangeLow; minX <= minXRangeHigh; minX++) 
				considerCandidateMin(minX, minY);
		}

		return best;
	},

	getFurthestNonBlockingPositionFrom: function (fromObj, distance = 1) {
		const { physics } = this.instance;

		const targetDims = getDims(this);
		const moverDims = getDims(fromObj);

		const targetBounds = getBounds(this.x, this.y, targetDims.w, targetDims.h);

		const moverHalfW = (moverDims.w / 2) | 0;

		const minToOrigin = (minX, minY) => {
			return {
				x: minX + moverHalfW,
				y: minY + moverDims.h - 1
			};
		};

		// Pick best by: highest cheb distance from fromObj, then highest manhattan
		let best = null;
		let bestDist = -1;
		let bestDistMan = -1;

		const considerCandidateMin = (minX, minY) => {
			const pos = minToOrigin(minX, minY);
			const moverBounds = getBounds(pos.x, pos.y, moverDims.w, moverDims.h);

			const d = rectChebyshevDistance(targetBounds, moverBounds);
			if (d !== distance)
				return;

			if (isFootprintBlocking(physics, pos.x, pos.y, moverDims.w, moverDims.h))
				return;

			if (!physics.hasLos(this.x, this.y, pos.x, pos.y))
				return;

			let dx = pos.x - fromObj.x;
			if (dx < 0)
				dx = -dx;

			let dy = pos.y - fromObj.y;
			if (dy < 0)
				dy = -dy;

			let distCheb = dx;
			if (dy > distCheb)
				distCheb = dy;

			const distMan = dx + dy;

			if (distCheb > bestDist) {
				bestDist = distCheb;
				bestDistMan = distMan;
				best = pos;
				return;
			}

			if (distCheb === bestDist) {
				if (distMan > bestDistMan) {
					bestDistMan = distMan;
					best = pos;
				}
			}
		};

		const minYRangeLow = targetBounds.minY - distance - moverDims.h + 1;
		const minYRangeHigh = targetBounds.maxY + distance;

		const minXRangeLow = targetBounds.minX - distance - moverDims.w + 1;
		const minXRangeHigh = targetBounds.maxX + distance;

		{
			const minX = targetBounds.maxX + distance;
			for (let minY = minYRangeLow; minY <= minYRangeHigh; minY++)
				considerCandidateMin(minX, minY);
		}

		{
			const minX = (targetBounds.minX - distance) - (moverDims.w - 1);
			for (let minY = minYRangeLow; minY <= minYRangeHigh; minY++)
				considerCandidateMin(minX, minY);
		}

		{
			const minY = targetBounds.maxY + distance;
			for (let minX = minXRangeLow; minX <= minXRangeHigh; minX++)
				considerCandidateMin(minX, minY);
		}

		{
			const minY = (targetBounds.minY - distance) - (moverDims.h - 1);
			for (let minX = minXRangeLow; minX <= minXRangeHigh; minX++)
				considerCandidateMin(minX, minY);
		}

		return best;
	}
};

module.exports = objDistanceChecks;

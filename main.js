const { PI, sqrt } = Math;

let digits = 8;

const R = 6371008.8;
const feet = 0.3048;
const inch = 0.0254;
const mile = 1609.344;
const nm = 1852;

const regex = {
	number: /^\d+(\.\d+)?/,
	negativeAngleSign: /^[-ws]|[ws]$/i,
	angleSign: /^[-+ewns]|[ewns]$/i,
	angleSeparator: /^(\s*[°'"]\s*|\s+)/,
};

const RAD = 180/PI;
const IRAD = PI/180;

const sin  = (deg) => Math.sin(deg*IRAD);
const cos  = (deg) => Math.cos(deg*IRAD);
const tan  = (deg) => Math.tan(deg*IRAD);
const asin = (sin) => Math.asin(sin)*RAD;
const acos = (cos) => Math.acos(cos)*RAD;
const atan = (tan) => Math.atan(tan)*RAD;

const round = (val) => {
	return Number(val.toFixed(digits));
};

const toMin = (deg) => {
	const abs = Math.abs(deg);
	const totalMin = Number((abs*60).toFixed(1));
	const min = (totalMin % 60).toFixed(1);
	const totalDeg = Math.round((totalMin - min)/60);
	return (
		(deg < 0 ? '-' : '')
		+ (
			(totalDeg > 0)
			? (`${totalDeg}° ${min}'`)
			: (`${min}'`)
		)
	);
};

const coordToVec = (...args) => {
	const [ lat, lon ] = args.flat();
	return [
		sin(lon)*cos(lat),
		sin(lat),
		cos(lon)*cos(lat),
	];
};

const vecToCoord = (...args) => {
	const [ x, y, z ] = args.flat();
	const lat = asin(y);
	const len = sqrt(x**2 + z**2);
	if (len === 0) {
		return [ lat, 0 ];
	}
	const temp = acos(z/len);
	const lon = x >= 0 ? temp : - temp;
	return [ lat, lon ];
};

const vecDist = (...args) => {
    const [ ax, ay, az, bx, by, bz ] = args.flat();
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    return Math.sqrt(dx**2 + dy**2 + dz**2);
};

const vecLen = (...args) => {
    const v = args.flat();
    return vecDist(0, 0, 0, v);
};

const normalizeVec = (...args) => {
    const v = args.flat();
    const l = vecLen(v);
    return v.map(val => val/l);
};

const coordInterp = (...args) => {
    const [ lat1, lon1, lat2, lon2, t ] = args.flat();
    const v1 = coordToVec(lat1, lon1);
    const v2 = coordToVec(lat2, lon2);
    const halfChord = vecDist(v1, v2)/2;
    const l = sqrt(1 - halfChord**2);
    const theta = asin(halfChord);
    const s = l*tan(theta*(1 - 2*t));
    const t2 = (1 - s/halfChord)/2;
    const v3 = v1.map((_, i) => v1[i] + (v2[i] - v1[i])*t2);
    return vecToCoord(normalizeVec(v3));
};

const haversine = (...args) => {
	const [ lat1, lon1, lat2, lon2, radius = 180/PI ] = args.flat();
	return acos(
		sin(lat1)*sin(lat2) +
		cos(lat1)*cos(lat2)*cos(lon1 - lon2)
	)/180*PI*radius;
};

const calcSAngle = (adj, opp) => {
	const len = sqrt(adj**2 + opp**2);
	if (len === 0) {
		return 0;
	}
	if (opp >= 0) {
		return acos(adj/len);
	}
	return - acos(adj/len);
};

const calcUAngle = (adj, opp) => {
	const len = sqrt(adj**2 + opp**2);
	if (len === 0) {
		return 0;
	}
	if (opp >= 0) {
		return acos(adj/len);
	}
	return 360 - acos(adj/len);
};

const rotX = (...args) => {
	const [ x, y, z, angle ] = args.flat();
	return [
		x,
		y*cos(angle) + z*sin(angle),
		z*cos(angle) - y*sin(angle),
	];
};

const rotY = (...args) => {
	const [ x, y, z, angle ] = args.flat();
	return [
		x*cos(angle) - z*sin(angle),
		y,
		z*cos(angle) + x*sin(angle),
	];
};

const rotZ = (...args) => {
	const [ x, y, z, angle ] = args.flat();
	return [
		x*cos(angle) + y*sin(angle),
		y*cos(angle) - x*sin(angle),
		z,
	];
};

const parseAngle = (stream) => {
	stream = stream.trim();
	const isNegative = regex.negativeAngleSign.test(stream);
	stream = stream.replace(regex.angleSign, '').trim();
	let currentUnit = 1;
	let sum = 0;
	while (stream !== '') {
		const strNumber = stream.match(regex.number)?.[0];
		if (strNumber == null) {
			break;
		}
		stream = stream.replace(regex.number, '');
		const parsedNumber = Number(strNumber);
		if (isNaN(parsedNumber)) {
			break;
		}
		const suffix = stream.match(regex.angleSeparator)?.[0]?.trim();
		if (suffix == null) {
			sum += parsedNumber*currentUnit;
			break;
		}
		stream = stream.replace(regex.angleSeparator, '');
		switch (suffix) {
			case '°':
				currentUnit = 1;
				break;
			case '\'':
				currentUnit = 1/60;
				break;
			case '"':
				currentUnit = 1/3600;
				break;
		}
		sum += parsedNumber*currentUnit;
		currentUnit /= 60;
	}
	if (stream !== '') {
		return NaN;
	}
	return isNegative ? - sum : sum;
};

const calcAzm = (...args) => {
    const [ lat1, lon1, lat2, lon2 ] = args.flat();
    const v = coordToVec(lat2, lon2 - lon1);
    const [ x, y ] = rotX(v, -lat1);
    return calcUAngle(y, x);
};

const shoot = (...args) => {
	const [ lat, lon, azm, dist ] = args.flat();
	const sinDist = sin(dist);
	let v = [
		sin(azm)*sinDist,
		cos(azm)*sinDist,
		cos(dist),
	];
	v = rotX(v, lat);
	v = rotY(v, -lon);
	return vecToCoord(v);
};

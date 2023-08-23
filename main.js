const { PI, sqrt } = Math;

const digits = 8;

const regex = {
	number: /^\d+(\.\d+)?/,
	negativeAngleSign: /^[-ws]|[ws]$/i,
	angleSign: /^[-+ewns]|[ewns]$/i,
	angleSeparator: /^(\s*[°'"]\s*|\s+)/,
};

const sin  = (deg) => Math.sin (deg/180*PI);
const cos  = (deg) => Math.cos (deg/180*PI);
const tan  = (deg) => Math.tan (deg/180*PI);
const asin = (sin) => Math.asin(sin)/PI*180;
const acos = (cos) => Math.acos(cos)/PI*180;
const atan = (tan) => Math.atan(tan)/PI*180;
const round = (val) => Number(val.toFixed(digits));
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
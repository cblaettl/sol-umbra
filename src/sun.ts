import * as THREE from 'three';  // Assuming you have this dependency.

export class SunLight extends THREE.Object3D {
    type: string = "SunLight";
    coordinates: THREE.Vector2;
    north: THREE.Vector3;
    east: THREE.Vector3;
    nadir: THREE.Vector3;
    sun_distance: number;
    azimuth: number = 0.0;
    elevation: number = 0.0;
    localDate: Date;
    hingeObject: THREE.Object3D;
    directionalLight: THREE.DirectionalLight;

    constructor(
        coordinates_: THREE.Vector2,
        north_: THREE.Vector3,
        east_: THREE.Vector3,
        nadir_: THREE.Vector3,
        sun_distance_: number = 1.0
    ) {
        super();
        this.coordinates = new THREE.Vector2().copy(coordinates_);
        this.north = new THREE.Vector3().copy(north_);
        this.east = new THREE.Vector3().copy(east_);
        this.nadir = new THREE.Vector3().copy(nadir_);
        this.sun_distance = sun_distance_;
        this.hingeObject = new THREE.Object3D();
        this.add(this.hingeObject);
        this.directionalLight = new THREE.DirectionalLight();
        this.directionalLight.castShadow = true;
        this.hingeObject.add(this.directionalLight);
        this.add(this.directionalLight.target);
        this.localDate = new Date();
    }

    toJSON(meta: any): any {
        const data = super.toJSON(meta);
        // TODO: Implement if required.
        return data;
    }

    updateOrientation(date: Date): void {
        this.localDate = date;
        const solarOrientationCalculator = new SolarOrientationCalculator();
        const sunOrientation = solarOrientationCalculator.getAzEl(
            this.coordinates.x,
            this.coordinates.y,
            this.localDate
        );
        this.azimuth = this._degreesToRadians(sunOrientation.azimuth);
        this.elevation = this._degreesToRadians(sunOrientation.elevation);
    }

    updateDirectionalLight(): void {
        const FADE_OUT_THRESHOLD = 2.0;
        const elevationDegrees = (180.0 * this.elevation / Math.PI);
        if (elevationDegrees <= 0.0) {
            this.directionalLight.intensity = 0.0;
            return;
        } else if (elevationDegrees <= FADE_OUT_THRESHOLD) {
            this.directionalLight.intensity = elevationDegrees / FADE_OUT_THRESHOLD;
        } else {
            this.directionalLight.intensity = 1.0;
        }

        // Reset the hingeObject's quaternion
        this.hingeObject.quaternion.copy( new THREE.Quaternion() );

        this.directionalLight.position.copy( this.north );
        this.directionalLight.position.multiplyScalar( this.sun_distance );
        var rotator = new THREE.Quaternion();
        rotator.setFromAxisAngle( this.east, this.elevation );
        this.hingeObject.quaternion.premultiply( rotator );
        rotator.setFromAxisAngle( this.nadir, this.azimuth );
        this.hingeObject.quaternion.premultiply( rotator );
    }

    private _degreesToRadians(degrees_: number): number {
        return (degrees_ % 360.0) * Math.PI / 180.0;
    }
}

class SolarOrientationCalculator {
    a: string = "some val";

    getAzEl(lat_: number, lon_: number, date_: Date = new Date()): { azimuth: number, elevation: number } {
      var jday = this._getJD( date_ );
      var tl = this._getTimeLocal( date_ );
      var tz = date_.getTimezoneOffset() / -60;
      // var dst = true;
      var total = jday + tl/1440.0 - tz/24.0;
      var T = this._calcTimeJulianCent( total );
      const sunOrientation = this._calcAzEl( false, T, tl, lat_, lon_, tz );
      return sunOrientation;
    }

    private _getJD(date_: Date = new Date()): number {
      var docmonth = date_.getMonth() + 1;
      var docday = date_.getDate();
      var docyear = date_.getFullYear();
      if ( (this._isLeapYear(docyear)) && (docmonth == 2) ) {
        if (docday > 29) {
          docday = 29;
        }
      } else {
        // 1900 is a known non-leap year
        if (docday > new Date(1900, docmonth, 0).getDate()) {
          docday = new Date(1900, docmonth, 0).getDate();
        }
      }
      if (docmonth <= 2) {
        docyear -= 1;
        docmonth += 12;
      }
      var A = Math.floor(docyear/100);
      var B = 2 - A + Math.floor(A/4);
      var JD = Math.floor(365.25*(docyear + 4716)) +
        Math.floor(30.6001*(docmonth+1)) + docday + B - 1524.5;
      return JD;
    }


    _getTimeLocal(date_: Date = new Date()): number {
      let totalMinutes = 0.0;
      totalMinutes += 60.0 * date_.getHours();
      // TODO
      // Remove one hour if DST is in effect
      totalMinutes += date_.getMinutes();
      totalMinutes += date_.getSeconds() / 60.0;
      return totalMinutes;
  }

  private _calcTimeJulianCent(jd: number): number {
      const T = (jd - 2451545.0) / 36525.0;
      return T;
  }

  private _calcAzEl(_output: any, T: number, localtime: number, latitude: number, longitude: number, zone: number): { azimuth: number, elevation: number } {
    let result = { "azimuth": 0.0, "elevation": 0.0 };
    const eqTime = this._calcEquationOfTime(T);
    const theta = this._calcSunDeclination(T);
    const solarTimeFix = eqTime + 4.0 * longitude - 60.0 * zone;
    // const earthRadVec = this._calcSunRadVector(T);
    let trueSolarTime = localtime + solarTimeFix;
    while (trueSolarTime > 1440) {
        trueSolarTime -= 1440;
    }
    let hourAngle = trueSolarTime / 4.0 - 180.0;
    if (hourAngle < -180) {
        hourAngle += 360.0;
    }
    const haRad = this._degToRad(hourAngle);
    let csz = Math.sin(this._degToRad(latitude)) *
        Math.sin(this._degToRad(theta)) + Math.cos(this._degToRad(latitude)) *
        Math.cos(this._degToRad(theta)) * Math.cos(haRad);
    csz = Math.min(Math.max(csz, -1.0), 1.0);
    const zenith = this._radToDeg(Math.acos(csz));
    let azRad: number;
    let azimuth: number;
    const azDenom = (Math.cos(this._degToRad(latitude)) * Math.sin(this._degToRad(zenith)));
    if (Math.abs(azDenom) > 0.001) {
        azRad = ((Math.sin(this._degToRad(latitude)) * Math.cos(this._degToRad(zenith))) - Math.sin(this._degToRad(theta))) / azDenom;
        azRad = Math.min(Math.max(azRad, -1.0), 1.0);
        azimuth = 180.0 - this._radToDeg(Math.acos(azRad));
        if (hourAngle > 0.0) {
            azimuth = -azimuth;
        }
    } else {
        azimuth = (latitude > 0.0) ? 180.0 : 0.0;
        if (azimuth < 0.0) {
            azimuth += 360.0;
        }
    }
    const exoatmElevation = 90.0 - zenith;

    // Atmospheric Refraction correction
    let refractionCorrection: number;
    const te = Math.tan(this._degToRad(exoatmElevation));
    if (exoatmElevation > 85.0) {
        refractionCorrection = 0.0;
    } else if (exoatmElevation > 5.0) {
        refractionCorrection = 58.1 / te - 0.07 / (te ** 3) + 0.000086 / (te ** 5);
    } else if (exoatmElevation > -0.575) {
        refractionCorrection = 1735.0 + exoatmElevation * (-518.2 + exoatmElevation * (103.4 + exoatmElevation * (-12.79 + exoatmElevation * 0.711)));
    } else {
        refractionCorrection = -20.774 / te;
    }
    refractionCorrection /= 3600.0;

    const solarZen = zenith - refractionCorrection;

    result.azimuth = Math.floor(azimuth * 100 + 0.5) / 100.0;
    result.elevation = Math.floor((90.0 - solarZen) * 100 + 0.5) / 100.0;

    return result;
}

  private _isLeapYear(yr: number): boolean {
      return ((yr % 4 == 0 && yr % 100 != 0) || yr % 400 == 0);
  }

  private _degToRad(angleDeg: number): number {
    return (Math.PI * angleDeg) / 180.0;
  }

  private _radToDeg(angleRad: number): number {
      return (180.0 * angleRad) / Math.PI;
  }


  private _calcEquationOfTime(t: number): number {
    const epsilon = this._calcObliquityCorrection(t);
    const l0 = this._calcGeomMeanLongSun(t);
    const e = this._calcEccentricityEarthOrbit(t);
    const m = this._calcGeomMeanAnomalySun(t);

    let y = Math.tan(this._degToRad(epsilon) / 2.0);
    y *= y;

    const sin2l0 = Math.sin(2.0 * this._degToRad(l0));
    const sinm = Math.sin(this._degToRad(m));
    const cos2l0 = Math.cos(2.0 * this._degToRad(l0));
    const sin4l0 = Math.sin(4.0 * this._degToRad(l0));
    const sin2m = Math.sin(2.0 * this._degToRad(m));

    const Etime = y * sin2l0 - 2.0 * e * sinm + 4.0 * e * y * sinm * cos2l0 - 0.5 * y * y * sin4l0 - 1.25 * e * e * sin2m;

    return this._radToDeg(Etime) * 4.0; // in minutes of time
}

private _calcSunDeclination(t: number): number {
    const e = this._calcObliquityCorrection(t);
    const lambda = this._calcSunApparentLong(t);

    const sint = Math.sin(this._degToRad(e)) * Math.sin(this._degToRad(lambda));
    const theta = this._radToDeg(Math.asin(sint));

    return theta; // in degree
}

// private _calcSunRadVector(t: number): number {
//     const v = this._calcSunTrueAnomaly(t);
//     const e = this._calcEccentricityEarthOrbit(t);

//     const R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(this._degToRad(v)));

//     return R; // in AU
// }

private _calcObliquityCorrection(t: number): number {
    const e0 = this._calcMeanObliquityOfEcliptic(t);
    const omega = 125.04 - 1934.136 * t;
    const e = e0 + 0.00256 * Math.cos(this._degToRad(omega));

    return e; // in degree
}

  private _calcSunApparentLong(t: number): number {
      const o = this._calcSunTrueLong(t);
      const omega = 125.04 - 1934.136 * t;
      const lambda = o - 0.00569 - 0.00478 * Math.sin(this._degToRad(omega));
      return lambda; // in degrees
  }

  private _calcGeomMeanLongSun(t: number): number {
      let L0 = 280.46646 + t * (36000.76983 + t * 0.0003032);
      while (L0 > 360.0) {
          L0 -= 360.0;
      }
      while (L0 < 0.0) {
          L0 += 360.0;
      }
      return L0; // in degrees
  }

  private _calcEccentricityEarthOrbit(t: number): number {
      const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
      return e; // unitless
  }

  private _calcGeomMeanAnomalySun(t: number): number {
      const M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
      return M; // in degrees
  }

  // private _calcSunTrueAnomaly(t: number): number {
  //     const m = this._calcGeomMeanAnomalySun(t);
  //     const c = this._calcSunEqOfCenter(t);
  //     const v = m + c;
  //     return v; // in degrees
  // }

  private _calcMeanObliquityOfEcliptic(t: number): number {
      const seconds = 21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813));
      const e0 = 23.0 + (26.0 + seconds / 60.0) / 60.0;
      return e0; // in degrees
  }

  private _calcSunTrueLong(t: number): number {
      const l0 = this._calcGeomMeanLongSun(t);
      const c = this._calcSunEqOfCenter(t);
      const O = l0 + c;
      return O; // in degrees
  }

  private _calcSunEqOfCenter(t: number): number {
      const m = this._calcGeomMeanAnomalySun(t);
      const mrad = this._degToRad(m);
      const sinm = Math.sin(mrad);
      const sin2m = Math.sin(mrad + mrad);
      const sin3m = Math.sin(mrad + mrad + mrad);
      const C = sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) + sin2m *
          (0.019993 - 0.000101 * t) + sin3m * 0.000289;
      return C; // in degrees
  }
}

import { D, roundInternal, type Dec } from "./numeric.ts";

export interface ScientificConstant {
  code: number;
  name: string;
  symbol: string;
  value: string;
}

/**
 * The calculator manual says these are CODATA recommended values (March 2007).
 * Values are transcribed from NIST's archived 2006 CODATA complete listing:
 * https://physics.nist.gov/cuu/Constants/ArchiveASCII/allascii_2006.txt
 * Exact rows keep the precision printed in that dated source.
 */
export const SCIENTIFIC_CONSTANTS: readonly ScientificConstant[] = [
  { code: 1, name: "proton mass", symbol: "mp", value: "1.672621637e-27" },
  { code: 2, name: "neutron mass", symbol: "mn", value: "1.674927211e-27" },
  { code: 3, name: "electron mass", symbol: "me", value: "9.10938215e-31" },
  { code: 4, name: "muon mass", symbol: "mμ", value: "1.88353130e-28" },
  { code: 5, name: "Bohr radius", symbol: "a0", value: "5.2917720859e-11" },
  { code: 6, name: "Planck constant", symbol: "h", value: "6.62606896e-34" },
  { code: 7, name: "nuclear magneton", symbol: "μN", value: "5.05078324e-27" },
  { code: 8, name: "Bohr magneton", symbol: "μB", value: "9.27400915e-24" },
  { code: 9, name: "reduced Planck constant", symbol: "ℏ", value: "1.054571628e-34" },
  { code: 10, name: "fine-structure constant", symbol: "α", value: "7.2973525376e-3" },
  { code: 11, name: "classical electron radius", symbol: "re", value: "2.8179402894e-15" },
  { code: 12, name: "electron Compton wavelength", symbol: "λc", value: "2.4263102175e-12" },
  { code: 13, name: "proton gyromagnetic ratio", symbol: "γp", value: "2.675222099e8" },
  { code: 14, name: "proton Compton wavelength", symbol: "λcp", value: "1.3214098446e-15" },
  { code: 15, name: "neutron Compton wavelength", symbol: "λcn", value: "1.3195908951e-15" },
  { code: 16, name: "Rydberg constant", symbol: "R∞", value: "10973731.568527" },
  { code: 17, name: "atomic mass constant", symbol: "u", value: "1.660538782e-27" },
  { code: 18, name: "proton magnetic moment", symbol: "μp", value: "1.410606662e-26" },
  { code: 19, name: "electron magnetic moment", symbol: "μe", value: "-9.28476377e-24" },
  { code: 20, name: "neutron magnetic moment", symbol: "μn", value: "-9.6623641e-27" },
  { code: 21, name: "muon magnetic moment", symbol: "μμ", value: "-4.49044786e-26" },
  { code: 22, name: "Faraday constant", symbol: "F", value: "96485.3399" },
  { code: 23, name: "elementary charge", symbol: "e", value: "1.602176487e-19" },
  { code: 24, name: "Avogadro constant", symbol: "NA", value: "6.02214179e23" },
  { code: 25, name: "Boltzmann constant", symbol: "k", value: "1.3806504e-23" },
  { code: 26, name: "molar volume of ideal gas", symbol: "Vm", value: "22.413996e-3" },
  { code: 27, name: "molar gas constant", symbol: "R", value: "8.314472" },
  { code: 28, name: "speed of light in vacuum", symbol: "C0", value: "299792458" },
  { code: 29, name: "first radiation constant", symbol: "C1", value: "3.74177118e-16" },
  { code: 30, name: "second radiation constant", symbol: "C2", value: "1.4387752e-2" },
  { code: 31, name: "Stefan-Boltzmann constant", symbol: "σ", value: "5.6704e-8" },
  { code: 32, name: "electric constant", symbol: "ε0", value: "8.854187817e-12" },
  { code: 33, name: "magnetic constant", symbol: "μ0", value: "1.2566370614e-6" },
  { code: 34, name: "magnetic flux quantum", symbol: "φ0", value: "2.067833667e-15" },
  { code: 35, name: "standard acceleration of gravity", symbol: "g", value: "9.80665" },
  { code: 36, name: "conductance quantum", symbol: "G0", value: "7.7480917004e-5" },
  { code: 37, name: "characteristic impedance of vacuum", symbol: "Z0", value: "376.730313461" },
  { code: 38, name: "Celsius temperature", symbol: "t", value: "273.15" },
  { code: 39, name: "Newtonian constant of gravitation", symbol: "G", value: "6.67428e-11" },
  { code: 40, name: "standard atmosphere", symbol: "atm", value: "101325" },
];

export interface UnitConversion {
  code: number;
  label: string;
  /** Paired Appendix B.8 factor, reused in the reverse direction. */
  pairFactor?: string;
  affine?: "fahrenheit-to-celsius" | "celsius-to-fahrenheit";
  /** The historical NIST Appendix B.8 source row, or explicit scale definition. */
  source: string;
}

/**
 * The 1995 NIST SP 811 factors intentionally retain the publication's stated
 * precision (including its rounded avoirdupois-ounce factor). Reverse-numbered
 * commands invert the paired factor as described by SP 811 B.3. Temperature
 * and calorie pairs are expressed directly below because their order is the
 * reverse of the ordinary odd/even factor pattern.
 */
export const UNIT_CONVERSIONS: readonly UnitConversion[] = [
  { code: 1, label: "in►cm", pairFactor: "2.54", source: "SP 811 (1995), App. B.8, inch to centimeter; exact" },
  { code: 2, label: "cm►in", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 3, label: "ft►m", pairFactor: "3.048e-1", source: "SP 811 (1995), App. B.8, foot to meter; exact" },
  { code: 4, label: "m►ft", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 5, label: "yd►m", pairFactor: "9.144e-1", source: "SP 811 (1995), App. B.8, yard to meter; exact" },
  { code: 6, label: "m►yd", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 7, label: "mile►km", pairFactor: "1.609344", source: "SP 811 (1995), App. B.8, international mile to kilometer" },
  { code: 8, label: "km►mile", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 9, label: "n mile►m", pairFactor: "1852", source: "SP 811 (1995), Table 9, international nautical mile" },
  { code: 10, label: "m►n mile", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 11, label: "acre►m²", pairFactor: "4.046873e3", source: "SP 811 (1995), App. B.8, acre based on U.S. survey foot" },
  { code: 12, label: "m²►acre", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 13, label: "gal(US)►L", pairFactor: "3.785412", source: "SP 811 (1995), App. B.8, U.S. gallon to liter" },
  { code: 14, label: "L►gal(US)", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 15, label: "gal(UK)►L", pairFactor: "4.54609", source: "SP 811 (1995), App. B.8, Imperial gallon to liter" },
  { code: 16, label: "L►gal(UK)", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 17, label: "pc►km", pairFactor: "3.085678e13", source: "SP 811 (1995), App. B.8, parsec to meter, scaled to kilometer" },
  { code: 18, label: "km►pc", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 19, label: "km/h►m/s", pairFactor: "2.777778e-1", source: "SP 811 (1995), App. B.8, kilometer per hour to meter per second" },
  { code: 20, label: "m/s►km/h", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 21, label: "oz►g", pairFactor: "2.834952e1", source: "SP 811 (1995), App. B.8, avoirdupois ounce to gram (published rounded factor)" },
  { code: 22, label: "g►oz", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 23, label: "lb►kg", pairFactor: "4.535924e-1", source: "SP 811 (1995), App. B.8, avoirdupois pound to kilogram" },
  { code: 24, label: "kg►lb", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 25, label: "atm►Pa", pairFactor: "1.01325e5", source: "SP 811 (1995), App. B.8, standard atmosphere to pascal; exact" },
  { code: 26, label: "Pa►atm", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 27, label: "mmHg►Pa", pairFactor: "1.333224e2", source: "SP 811 (1995), App. B.8, conventional mmHg to pascal" },
  { code: 28, label: "Pa►mmHg", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 29, label: "hp►kW", pairFactor: "7.456999e-1", source: "SP 811 (1995), App. B.8, mechanical horsepower to watt, scaled to kilowatt" },
  { code: 30, label: "kW►hp", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 31, label: "kgf/cm²►Pa", pairFactor: "9.80665e4", source: "SP 811 (1995), App. B.8, kilogram-force per square centimeter to pascal" },
  { code: 32, label: "Pa►kgf/cm²", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 33, label: "kgf·m►J", pairFactor: "9.80665", source: "SP 811 (1995), App. B.8, kilogram-force meter to joule" },
  { code: 34, label: "J►kgf·m", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 35, label: "lbf/in²►kPa", pairFactor: "6.894757", source: "SP 811 (1995), App. B.8, pound-force per square inch to kilopascal" },
  { code: 36, label: "kPa►lbf/in²", source: "SP 811 (1995), App. B.3, reverse factor" },
  { code: 37, label: "°F►°C", affine: "fahrenheit-to-celsius", source: "SP 811 (1995), temperature scales and exact degree interval" },
  { code: 38, label: "°C►°F", affine: "celsius-to-fahrenheit", source: "SP 811 (1995), temperature scales and exact degree interval" },
  { code: 39, label: "J►cal", pairFactor: "4.18580", source: "SP 811 (1995), App. B.8, calorie (15 °C) to joule" },
  { code: 40, label: "cal►J", pairFactor: "4.18580", source: "SP 811 (1995), App. B.8, calorie (15 °C) to joule" },
];

export function scientificConstantCallName(code: number): string {
  return `const-${String(code).padStart(2, "0")}`;
}

export function unitConversionCallName(code: number): string {
  return `conv-${String(code).padStart(2, "0")}`;
}

export function scientificConstantByCallName(name: string): ScientificConstant | undefined {
  const match = /^const-(\d{2})$/.exec(name);
  return match ? SCIENTIFIC_CONSTANTS[Number(match[1]) - 1] : undefined;
}

export function unitConversionByCallName(name: string): UnitConversion | undefined {
  const match = /^conv-(\d{2})$/.exec(name);
  return match ? UNIT_CONVERSIONS[Number(match[1]) - 1] : undefined;
}

export function scientificCallLabel(name: string): string | undefined {
  return scientificConstantByCallName(name)?.symbol ?? unitConversionByCallName(name)?.label;
}

export function convertUnitValue(code: number, input: Dec): Dec {
  if (code === 37) {
    return roundInternal(input.minus(32).times(5).div(9));
  }
  if (code === 38) {
    return roundInternal(input.times(9).div(5).plus(32));
  }
  if (code === 39) {
    return roundInternal(input.div("4.18580"));
  }
  if (code === 40) {
    return roundInternal(input.times("4.18580"));
  }
  const entry = UNIT_CONVERSIONS[code - 1];
  const factor = entry?.pairFactor ?? UNIT_CONVERSIONS[code - 2]?.pairFactor;
  if (!entry || !factor) {
    throw new Error(`Unknown conversion code ${code}`);
  }
  return roundInternal(code % 2 === 1 ? input.times(D(factor)) : input.div(D(factor)));
}

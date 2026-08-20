const PROVINCE_ENTRIES = [
  ["\u5317\u4eac", "BJ"],
  ["\u5929\u6d25", "TJ"],
  ["\u6cb3\u5317", "HE"],
  ["\u5c71\u897f", "SX"],
  ["\u5185\u8499\u53e4", "NM"],
  ["\u8fbd\u5b81", "LN"],
  ["\u5409\u6797", "JL"],
  ["\u9ed1\u9f99\u6c5f", "HL"],
  ["\u4e0a\u6d77", "SH"],
  ["\u6c5f\u82cf", "JS"],
  ["\u6d59\u6c5f", "ZJ"],
  ["\u5b89\u5fbd", "AH"],
  ["\u798f\u5efa", "FJ"],
  ["\u6c5f\u897f", "JX"],
  ["\u5c71\u4e1c", "SD"],
  ["\u6cb3\u5357", "HA"],
  ["\u6e56\u5317", "HB"],
  ["\u6e56\u5357", "HN"],
  ["\u5e7f\u4e1c", "GD"],
  ["\u5e7f\u897f", "GX"],
  ["\u6d77\u5357", "HI"],
  ["\u91cd\u5e86", "CQ"],
  ["\u56db\u5ddd", "SC"],
  ["\u8d35\u5dde", "GZ"],
  ["\u4e91\u5357", "YN"],
  ["\u897f\u85cf", "XZ"],
  ["\u9655\u897f", "SN"],
  ["\u7518\u8083", "GS"],
  ["\u9752\u6d77", "QH"],
  ["\u5b81\u590f", "NX"],
  ["\u65b0\u7586", "XJ"]
];

const PROVINCE_CODE_BY_NAME = new Map(PROVINCE_ENTRIES);
const PROVINCE_NAME_BY_CODE = new Map(
  PROVINCE_ENTRIES.map(([name, code]) => [code, name])
);

export function normalizeProvinceCode(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  if (PROVINCE_NAME_BY_CODE.has(normalized)) {
    return normalized;
  }

  return PROVINCE_CODE_BY_NAME.get(String(value || "").trim()) || null;
}

export function denormalizeProvinceName(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return PROVINCE_NAME_BY_CODE.get(normalized) || String(value || "").trim() || null;
}

export function listProvinceCatalog() {
  return PROVINCE_ENTRIES.map(([name, code]) => ({ name, code }));
}

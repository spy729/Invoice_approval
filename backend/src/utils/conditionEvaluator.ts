export type Operator =
  | '=='
  | '==='
  | '!='
  | '!=='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'in'
  | 'not in'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'exists';

export interface Condition {
  field: string; // supports dot-path like 'customer.address.city'
  operator: Operator;
  value?: any; // some operators (exists) may not need a value
}

function normalizeFieldName(name: string) {
  return name.replace(/\s+/g, '').toLowerCase();
}

function getValueByPath(obj: any, path: string) {
  if (!obj) return undefined;
  const parts = path.split('.').map(normalizeFieldName);
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    // Try to find key ignoring spaces/case
    const key = Object.keys(cur).find(k => normalizeFieldName(k) === p);
    cur = key ? cur[key] : undefined;
  }
  return cur;
}

function isNumeric(v: any) {
  return (typeof v === 'number' && isFinite(v)) || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)));
}

export function evaluateCondition(cond: Condition, data: any): boolean {
  const { field, operator, value } = cond;
  const actual = getValueByPath(data, field);

  // 'exists' checks presence (not null/undefined)
  if (operator === 'exists') {
    return actual !== undefined && actual !== null;
  }

  // For other operators, if actual is undefined/null and operator isn't 'in'/'contains', return false
  if (actual === undefined || actual === null) {
    // special case: 'in' with empty array should be false
    return false;
  }

  switch (operator) {
    case '==':
      // loose equality
      // eslint-disable-next-line eqeqeq
      return actual == value;
    case '===':
      return actual === value;
    case '!=':
      // eslint-disable-next-line eqeqeq
      return actual != value;
    case '!==':
      return actual !== value;
    case '>':
      if (isNumeric(actual) && isNumeric(value)) return Number(actual) > Number(value);
      return String(actual) > String(value);
    case '>=':
      if (isNumeric(actual) && isNumeric(value)) return Number(actual) >= Number(value);
      return String(actual) >= String(value);
    case '<':
      if (isNumeric(actual) && isNumeric(value)) return Number(actual) < Number(value);
      return String(actual) < String(value);
    case '<=':
      if (isNumeric(actual) && isNumeric(value)) return Number(actual) <= Number(value);
      return String(actual) <= String(value);
    case 'in':
      // value should be array or string (for substring)
      if (Array.isArray(value)) return value.includes(actual);
      if (typeof value === 'string') return value.includes(String(actual));
      return false;
    case 'not in':
      if (Array.isArray(value)) return !value.includes(actual);
      if (typeof value === 'string') return !value.includes(String(actual));
      return false;
    case 'contains':
      // actual contains value (strings or arrays)
      if (typeof actual === 'string') return String(actual).includes(String(value));
      if (Array.isArray(actual)) return actual.includes(value);
      return false;
    case 'startsWith':
      if (typeof actual === 'string') return actual.startsWith(String(value));
      return false;
    case 'endsWith':
      if (typeof actual === 'string') return actual.endsWith(String(value));
      return false;
    default:
      return false;
  }
}

export default evaluateCondition;

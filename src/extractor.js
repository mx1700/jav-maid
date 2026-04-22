/**
 * 从文件名中提取番号和额外信息
 * @param {string} name - 文件名
 * @returns {object|null} - { code: string, extra: string|null }
 */
export function extractCode(name) {
  // 预处理：下划线替换为横线
  const processed = name.replace(/_/g, '-');

  // 从后向前匹配番号：[A-Z]{2,5}-?\d{3,5}
  const codeRegex = /[A-Z]{2,5}-?\d{3,5}/gi;
  const matches = processed.match(codeRegex);

  if (!matches || matches.length === 0) {
    return null;
  }

  // 取最后一个匹配（从后向前）
  const rawCode = matches[matches.length - 1].toUpperCase();

  // 统一格式化为 XXX-YYY
  let code = rawCode;
  if (!rawCode.includes('-')) {
    // ABC123 -> ABC-123
    const match = rawCode.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      code = `${match[1]}-${match[2]}`;
    }
  }

  // 识别额外信息（-C, -U, -UC），忽略大小写
  let extra = null;
  const extraRegex = /-(UC|[CU])\b/gi;
  const extraMatches = processed.match(extraRegex);
  if (extraMatches) {
    // 检查是否包含 UC
    if (processed.match(/-UC\b/gi)) {
      extra = 'UC';
    } else {
      // 取最后一个匹配的额外信息
      const lastMatch = extraMatches[extraMatches.length - 1].replace(/^-/, '').toUpperCase();
      extra = lastMatch;
    }
  }

  return { code, extra };
}

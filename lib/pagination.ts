export function parsePaging(sp: URLSearchParams, defaultSize = 12, maxSize = 50) {
  const page = Math.max(1, parseInt(sp.get("page") || "", 10) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, parseInt(sp.get("pageSize") || "", 10) || defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export const pageMeta = (count: number, page: number, pageSize: number) => ({ count, page, pageCount: Math.max(1, Math.ceil(count / pageSize)) });

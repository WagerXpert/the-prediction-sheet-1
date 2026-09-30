// Supabase/PostgREST caps any single response at the project's max-rows setting
// (1000 on this project) regardless of how many rows actually match a query.
// A plain `.select()` on a table bigger than that silently returns a truncated
// page with no error — so any query that can return more than ~1000 rows must
// be paged through with `.range()` until a short page signals the real end.
export async function fetchAllRows<T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await queryPage(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

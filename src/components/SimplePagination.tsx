export function SimplePagination({
  page,
  setPage,
  totalPages,
}: {
  page: number
  setPage: (page: number) => void
  totalPages: number
}) {
  return (
    <div className="flex items-center gap-2">
      {page > 1 && <span onClick={() => setPage(page - 1)}>{"<"}</span>}
      <span>
        {page} / {totalPages}
      </span>
      {page < totalPages && (
        <span onClick={() => setPage(page + 1)}>{">"}</span>
      )}
    </div>
  )
}

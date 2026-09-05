export default function DataTable({ ariaLabel, columns, rows, getRowId = (row) => row.id, emptyMessage = 'No records match this view.', footer }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table" aria-label={ariaLabel}>
        <thead>
          <tr>{columns.map((column) => <th key={column.key} scope="col" className={column.className}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowId(row)} data-record-id={getRowId(row)}>
              {columns.map((column) => <td key={column.key} className={column.className}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={columns.length} className="data-table__empty">{emptyMessage}</td></tr>}
        </tbody>
      </table>
      {footer && <div className="table-footer">{footer}</div>}
    </div>
  );
}

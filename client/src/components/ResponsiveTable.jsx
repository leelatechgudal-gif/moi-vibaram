import React from 'react';

/**
 * A reusable table component that renders as a standard responsive table on desktop
 * and transforms into a clean list of cards on mobile/smaller viewports.
 */
const ResponsiveTable = React.forwardRef(({
    headers,
    rows,
    renderRow,
    renderMobileCard,
    headerContent = null,
    tableWrapClassName = 'card table-wrap',
    tableClassName = 'table',
    emptyState = null,
}, ref) => {
    if (!rows || rows.length === 0) {
        return emptyState;
    }

    return (
        <>
            {/* Desktop View (Table) */}
            <div ref={ref} className={`${tableWrapClassName} hide-mobile`}>
                {headerContent}
                <table className={tableClassName}>
                    <thead>
                        <tr>
                            {headers.map((header, idx) => (
                                <th key={idx}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const cells = renderRow(row, idx);
                            return (
                                <tr key={row._id || idx}>
                                    {cells.map((cell, cellIdx) => (
                                        <td key={cellIdx}>{cell}</td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile View (Card List) */}
            <div className="show-mobile">
                {rows.map((row, idx) => renderMobileCard(row, idx))}
            </div>
        </>
    );
});

export default ResponsiveTable;

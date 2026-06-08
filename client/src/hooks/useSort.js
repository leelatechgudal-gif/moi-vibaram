import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * A reusable hook for client-side sorting.
 * 
 * @param {string} defaultField The default field name to sort by.
 * @param {string} defaultOrder The default sort order ('asc' or 'desc').
 */
export default function useSort(defaultField = 'date', defaultOrder = 'desc') {
    const [sortField, setSortField] = useState(defaultField);
    const [sortOrder, setSortOrder] = useState(defaultOrder);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const renderSortIcon = (field) => {
        if (sortField !== field) {
            return React.createElement('span', {
                style: { opacity: 0.3, marginLeft: 4, display: 'inline-flex' }
            }, '↕');
        }
        return sortOrder === 'asc' ? 
            React.createElement(ChevronUp, {
                size: 14,
                style: { marginLeft: 4, color: 'var(--primary)', display: 'inline-flex', verticalAlign: 'middle' }
            }) : 
            React.createElement(ChevronDown, {
                size: 14,
                style: { marginLeft: 4, color: 'var(--primary)', display: 'inline-flex', verticalAlign: 'middle' }
            });
    };

    const getSortedItems = (items, customComparators = {}) => {
        return [...items].sort((a, b) => {
            if (customComparators[sortField]) {
                return customComparators[sortField](a, b, sortOrder);
            }

            let valA = a[sortField];
            let valB = b[sortField];

            // Normalize strings for case-insensitive comparison
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
            }
            if (typeof valB === 'string') {
                valB = valB.toLowerCase();
            }

            // Treat null/undefined consistently
            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    };

    return {
        sortField,
        sortOrder,
        setSortField,
        setSortOrder,
        handleSort,
        renderSortIcon,
        getSortedItems
    };
}

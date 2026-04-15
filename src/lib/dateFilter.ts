export type DateFilter = {
    start: string | null;
    end: string | null;
};

export function applyDateFilter<T extends { date: string }>(
    data: T[],
    filter: DateFilter
) {
    return data.filter((row) => {
        if (filter.start && row.date < filter.start) return false;
        if (filter.end && row.date > filter.end) return false;
        return true;
    });
}
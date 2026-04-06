export type CalendarView = "year" | "month" | "week" | "day";

export type DetailPanelType = "month" | "day" | "hour";

export type SelectedHour = {
  dateKey: string;
  hour: number;
};

export type CalendarSelection = {
  selectedMonth: Date | null;
  selectedDay: Date | null;
  selectedHour: SelectedHour | null;
};

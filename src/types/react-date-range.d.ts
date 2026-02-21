declare module 'react-date-range' {
  import { Locale } from 'date-fns';
  
  export interface Range {
    startDate?: Date;
    endDate?: Date;
    key?: string;
    color?: string;
  }
  
  export interface DateRangeProps {
    ranges: Range[];
    onChange?: (ranges: { [key: string]: Range }) => void;
    months?: number;
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    locale?: Locale;
    className?: string;
    showSelectionPreview?: boolean;
    showMonthAndYearPickers?: boolean;
    showDateDisplay?: boolean;
    direction?: 'horizontal' | 'vertical';
    disabledDates?: Date[];
    minDate?: Date;
    maxDate?: Date;
    color?: string;
    rangeColors?: string[];
    dateDisplayFormat?: string;
    monthDisplayFormat?: string;
    weekdayDisplayFormat?: string;
    dayDisplayFormat?: string;
    startDatePlaceholder?: string;
    endDatePlaceholder?: string;
    staticRanges?: StaticRange[];
    inputRanges?: InputRange[];
  }
  
  export interface StaticRange {
    label: string;
    range: () => Range;
    isSelected: (range: Range) => boolean;
    hasCustomRendering?: boolean;
  }
  
  export interface InputRange {
    label: string;
    range: (value: number) => Range;
    getCurrentValue: (range: Range) => number;
  }
  
  export class DateRange extends React.Component<DateRangeProps> {}
  export class Calendar extends React.Component<DateRangeProps> {}
  export class DefinedRange extends React.Component<DateRangeProps> {}
  
  export const defaultStaticRanges: StaticRange[];
  export const createStaticRanges: (ranges: StaticRange[]) => StaticRange[];
}
import { getRangeDates, getMonthRange } from '../lib/date-utils';
import NepaliDate from 'nepali-date-converter';

console.log('--- Debug Date Ranges ---');
const today = new Date();
console.log('Today (Server Local):', today.toString());
console.log('Today (ISO):', today.toISOString());

console.log('\n--- Gregorian: This Month ---');
const gregRange = getRangeDates('this-month', 'gregorian');
console.log('Start:', gregRange.start.toString());
console.log('End:', gregRange.end.toString());

console.log('\n--- Nepali: This Month ---');
const nepRange = getRangeDates('this-month', 'nepali');
console.log('Start:', nepRange.start.toString());
console.log('End:', nepRange.end.toString());

const currentNd = new NepaliDate(today);
console.log('\nCurrent Nepali Date:', currentNd.format('YYYY-MM-DD'));

console.log('\n--- Dashboard Header (getMonthRange) ---');
const dashboardGreg = getMonthRange(today, 'gregorian');
console.log('Gregorian Dashboard:', dashboardGreg.start.toString(), '-', dashboardGreg.end.toString());

const dashboardNep = getMonthRange(today, 'nepali');
console.log('Nepali Dashboard:', dashboardNep.start.toString(), '-', dashboardNep.end.toString());

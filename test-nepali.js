const NepaliDate = require('nepali-date-converter').default || require('nepali-date-converter');

try {
    const nd = new NepaliDate(2081, 0, 1); // Baisakh 1, 2081
    console.log('Year:', nd.getYear());
    console.log('Month:', nd.getMonth());
    console.log('Date:', nd.getDate());
    console.log('Format:', nd.format('YYYY-MM-DD'));

    // Check if we can get days in month
    // Some libraries have static methods or instance methods
    // Let's print keys
    // console.log('Keys:', Object.keys(nd));
    // console.log('Proto Keys:', Object.keys(Object.getPrototypeOf(nd)));

    // Try specific methods that might exist
    // console.log('Days in month?', nd.getDaysInMonth && nd.getDaysInMonth());

    const day0 = new NepaliDate(2081, 1, 0);
    console.log('Day 0 of Month 1 (Jestha) -> Should be end of Baisakh:', day0.format('YYYY-MM-DD'));
    console.log('Day 0 Date:', day0.getDate());

    const invalid = new NepaliDate(2081, 1, 32); // Jestha 32
    console.log('Jestha 32 Format:', invalid.format('YYYY-MM-DD'));
    console.log('Jestha 32 Month Index:', invalid.getMonth()); // Should be 1 if valid, 2 if rolled over
    console.log('Jestha 32 Date:', invalid.getDate());

    const d33 = new NepaliDate(2081, 1, 33);
    console.log('Jestha 33 Month Index:', d33.getMonth());

} catch (e) {
    console.error(e);
}

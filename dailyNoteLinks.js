// Daily Note Links - Templater Script
// This script automatically creates and maintains day links when a new daily note is created

// Function to get all available daily note dates
function getAllAvailableDates() {
    const dailyNotesDir = 'Daily Notes';
    const files = app.vault.getMarkdownFiles()
        .filter(file => file.path.startsWith(dailyNotesDir + '/'))
        .map(file => file.basename)
        .filter(filename => /^\d{4}-\d{2}-\d{2}$/.test(filename))
        .sort();
    
    return files;
}

// Function to find closest previous day
function findClosestPrevious(currentDate, availableDates) {
    const current = new Date(currentDate);
    let closest = null;
    
    for (const dateStr of availableDates) {
        const date = new Date(dateStr);
        if (date < current) {
            closest = dateStr;
        } else {
            break;
        }
    }
    
    return closest;
}

// Function to get the next day (tomorrow)
function getNextDay(currentDate) {
    const current = new Date(currentDate);
    const nextDay = new Date(current);
    nextDay.setDate(current.getDate() + 1);
    return nextDay.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}


// Main function - Templater export
module.exports = async function(tp) {
    const currentDate = tp.file.title;
    const dateMatch = currentDate.match(/^\d{4}-\d{2}-\d{2}$/);
    
    if (!dateMatch) {
        console.log('Not a daily note, skipping day links');
        return "";
    }
    
    console.log(`Setting up day links for ${currentDate}`);
    
    // Get all available dates (excluding the current one)
    const availableDates = getAllAvailableDates().filter(date => date !== currentDate);
    
    // Find closest previous day
    const prevDate = findClosestPrevious(currentDate, availableDates);
    
    // Get the next day (tomorrow)
    const nextDate = getNextDay(currentDate);
    
    console.log(`Previous: ${prevDate}, Next: ${nextDate}`);
    
    // Create the day links without section header
    const prevLink = prevDate ? `[[${prevDate}]]` : '(No previous day)';
    const nextLink = `[[${nextDate}]]`;
    const dayLinks = `← ${prevLink} | ${nextLink} →`;
    
    console.log('Day links created successfully');
    return dayLinks;
};

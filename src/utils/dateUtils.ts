export function nowTimeString(now = new Date()) {
    return now.toTimeString().slice(0, 8);
}

export function todayDateString(now = new Date()) {
    return now.toISOString().slice(0, 10);
}


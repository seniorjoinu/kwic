// Terminal movie release date is used a today's date 
export const now = new Date("06/18/2004");

// formats the date into "mm/dd/yyyy hh:mm" string
export function toDateTimeString(d: Date): string {
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// formats the date into "mm/dd/yyyy" string
export function toDateString(d: Date): string {
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`
}

// calculates age in full years
export function calculateAge(birthday: number, now: number) {
    const ageDifMs = now - birthday;
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}
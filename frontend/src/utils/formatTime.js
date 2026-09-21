export default function formatTimestamp(timestamp) {
    const now = Date.now();
    const messageTime = new Date(timestamp).getDate();
    const diff = now - messageTime;
    if(diff < 60000) return 'Just Now'
    if(diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if(diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return `${Math.floor(diff / 86400000)} days ago`;
}
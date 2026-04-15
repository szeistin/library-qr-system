const API_URL = import.meta.env.VITE_API_URL;

export async function registerVisitor(data) {
  const res = await fetch(`${API_URL}/visitors/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error);
  }
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${API_URL}/stats`);
  return res.json();
}

export async function searchBooks(query, category) {
  let url = `${API_URL}/books/search?`;
  if (query) url += `q=${encodeURIComponent(query)}&`;
  if (category) url += `category=${encodeURIComponent(category)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json();
}

export async function getCategories() {
  const res = await fetch(`${API_URL}/books/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function borrowBook(token, data) {
  const res = await fetch(`${API_URL}/loans/borrow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error);
  }
  return res.json(); // must include borrow_qr_token
}

export async function getVisitorLoans(visitorId) {
  const res = await fetch(`${API_URL}/loans/visitor/${visitorId}`);
  if (!res.ok) throw new Error('Failed to fetch loans');
  return res.json();
}

export async function getRecommendedBooks(dob) {
  const res = await fetch(`${API_URL}/books/recommended?dob=${dob}`);
  if (!res.ok) throw new Error('Failed to fetch recommended books');
  return res.json();
}
export async function loginStaff(username, pin) {
  const res = await fetch(`${API_URL}/staff/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error);
  }
  return res.json();
}

export async function registerStaff(username, position, pin, confirmPin) {
  const res = await fetch(`${API_URL}/staff/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, position, pin, confirmPin }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error);
  }
  return res.json();
}
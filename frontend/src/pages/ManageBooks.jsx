import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Search, Library, BookUp, BookDown, AlertCircle, Lock } from "lucide-react";
import { Toaster, toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL;
const OTHERS_VALUE = "__others__";

// Keep only digits (and X for ISBN-10)
const cleanIsbn = (v = "") => v.replace(/[^0-9Xx]/g, "").toUpperCase();

// Free lookup #1: Open Library
async function lookupOpenLibrary(isbn) {
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
  );
  if (!res.ok) return null;
  const json = await res.json();
  const d = json[`ISBN:${isbn}`];
  if (!d) return null;
  return {
    title: [d.title, d.subtitle].filter(Boolean).join(": "),
    author: (d.authors || []).map((a) => a.name).join(", "),
    publisher: (d.publishers || []).map((p) => p.name).join(", "),
    date_published: d.publish_date || "",
  };
}

// Free lookup #2 (fallback): Google Books
async function lookupGoogleBooks(isbn) {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`
  );
  if (!res.ok) return null;
  const json = await res.json();
  const v = json.items?.[0]?.volumeInfo;
  if (!v) return null;
  return {
    title: [v.title, v.subtitle].filter(Boolean).join(": "),
    author: (v.authors || []).join(", "),
    publisher: v.publisher || "",
    date_published: v.publishedDate || "",
  };
}

const safeLookup = async (fn, isbn) => {
  try {
    return await fn(isbn);
  } catch {
    return null;
  }
};

export default function ManageBooks() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  // Copies are kept as text while typing and converted to numbers on save
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    category: "",
    total_copies: "",
    available_copies: "",
    isbn: "",
    publisher: "",
    date_published: "",
  });
  // "Others" category support
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  // New state to hold our dynamic stats
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    borrowed: 0,
    overdue: 0
  });

  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Categories shown in the Add/Edit dropdown ("Others" is added separately)
  const categoryOptions = categories.filter(
    (c) => c.trim().toLowerCase() !== "others"
  );

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (pinInput.length !== 4) {
      toast.error("Please enter a 4-digit PIN");
      return;
    }

    setPinLoading(true);
    try {
      const res = await fetch(`${API_URL}/staff/verify-pin`, {
        method: "POST",
        headers,
        body: JSON.stringify({ pin: pinInput }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Incorrect PIN code");

      setIsUnlocked(true);
      toast.success("Access granted");
    } catch (err) {
      toast.error(err.message);
      setPinInput("");
    } finally {
      setPinLoading(false);
    }
  };

  const fetchBooksAndStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch Books
      const resBooks = await fetch(`${API_URL}/books`, { headers });
      let booksData = [];
      if (resBooks.ok) {
        booksData = await resBooks.json();
        setBooks(booksData);

        const uniqueCategories = [
          ...new Set(booksData.map((b) => b.category).filter((c) => c)),
        ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        setCategories(uniqueCategories);
      } else {
        toast.error("Failed to load books");
      }

      // 2. Calculate Book Totals (Total Copies vs Available)
      const totalCopies = booksData.reduce((sum, book) => sum + (book.total_copies || 0), 0);
      const availableCopies = booksData.reduce((sum, book) => sum + (book.available_copies || 0), 0);
      const borrowedCopies = totalCopies - availableCopies;

      // 3. Fetch Active Loans to count Overdue books
      let overdueCount = 0;
      const resLoans = await fetch(`${API_URL}/loans/active`, { headers });
      if (resLoans.ok) {
        const loansData = await resLoans.json();
        const now = new Date();
        overdueCount = loansData.filter(l => new Date(l.due_date) < now && l.status !== "returned").length;
      }

      // Update the stats state
      setStats({
        total: totalCopies,
        available: availableCopies,
        borrowed: borrowedCopies,
        overdue: overdueCount
      });

    } catch (err) {
      console.error(err);
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchBooksAndStats();
    }
  }, [isUnlocked]);

  const filteredBooks = books
    .filter((book) => {
      const matchesSearch =
        searchTerm === "" ||
        (book.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (book.author || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (book.isbn || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cleanIsbn(searchTerm) !== "" &&
          cleanIsbn(book.isbn || "").includes(cleanIsbn(searchTerm)));
      const matchesCategory =
        selectedCategory === "" || book.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const catA = a.category || "";
      const catB = b.category || "";
      const categoryComparison = catA.localeCompare(catB, undefined, { sensitivity: "base" });

      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      const titleA = a.title || "";
      const titleB = b.title || "";
      return titleA.localeCompare(titleB, undefined, { sensitivity: "base" });
    });

  const handleOpenModal = (book = null) => {
    if (book) {
      const cat = book.category || "";
      const isCustom = cat !== "" && !categoryOptions.includes(cat);
      setEditingBook(book);
      setFormData({
        title: book.title,
        author: book.author || "",
        category: isCustom ? "" : cat,
        total_copies: String(book.total_copies ?? ""),
        available_copies: String(book.available_copies ?? ""),
        isbn: book.isbn || "",
        publisher: book.publisher || "",
        date_published: book.date_published || "",
      });
      setIsOtherCategory(isCustom);
      setCustomCategory(isCustom ? cat : "");
    } else {
      setEditingBook(null);
      setFormData({
        title: "",
        author: "",
        category: "",
        total_copies: "",
        available_copies: "",
        isbn: "",
        publisher: "",
        date_published: "",
      });
      setIsOtherCategory(false);
      setCustomCategory("");
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingBook(null);
    setFormData({
      title: "",
      author: "",
      category: "",
      total_copies: "",
      available_copies: "",
      isbn: "",
      publisher: "",
      date_published: "",
    });
    setIsOtherCategory(false);
    setCustomCategory("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Copies: digits only, so staff can simply type the number
    const val = name.includes("copies") ? value.replace(/\D/g, "") : value;
    setFormData({ ...formData, [name]: val });
  };

  const handleCategorySelect = (e) => {
    const value = e.target.value;
    if (value === OTHERS_VALUE) {
      setIsOtherCategory(true);
      setFormData({ ...formData, category: "" });
    } else {
      setIsOtherCategory(false);
      setCustomCategory("");
      setFormData({ ...formData, category: value });
    }
  };

  // Fill in the form from a typed ISBN
  const handleIsbnLookup = async () => {
    const isbn = cleanIsbn(formData.isbn);
    if (isbn.length !== 10 && isbn.length !== 13) {
      toast.error("Please enter a valid 10 or 13-digit ISBN");
      return;
    }

    // Already in the library? Open it so staff can just update the copies.
    const existing = books.find(
      (b) => cleanIsbn(b.isbn || "") === isbn && b._id !== editingBook?._id
    );
    if (existing) {
      toast.info("This ISBN is already in the library. You can update its copies here.");
      handleOpenModal(existing);
      return;
    }

    setLookupLoading(true);
    try {
      const found =
        (await safeLookup(lookupOpenLibrary, isbn)) ||
        (await safeLookup(lookupGoogleBooks, isbn));

      if (!found) {
        toast.error("No details found for this ISBN. Please fill in the details manually.");
        setFormData((prev) => ({ ...prev, isbn }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        isbn,
        title: found.title || prev.title,
        author: found.author || prev.author,
        publisher: found.publisher || prev.publisher,
        date_published: found.date_published || prev.date_published,
      }));
      toast.success("Book details found. Please review them and enter the copies.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalCategory = isOtherCategory ? customCategory.trim() : formData.category;
    if (isOtherCategory && !finalCategory) {
      toast.error("Please type the category");
      return;
    }
    if (formData.total_copies === "" || Number(formData.total_copies) < 1) {
      toast.error("Total copies must be at least 1");
      return;
    }
    if (formData.available_copies === "") {
      toast.error("Please enter the available copies");
      return;
    }

    const isbn = cleanIsbn(formData.isbn);
    if (isbn) {
      const duplicate = books.find(
        (b) => cleanIsbn(b.isbn || "") === isbn && b._id !== editingBook?._id
      );
      if (duplicate) {
        toast.error(`A book with this ISBN already exists: "${duplicate.title}"`);
        return;
      }
    }

    setLoading(true);
    try {
      const url = editingBook
        ? `${API_URL}/books/${editingBook._id}`
        : `${API_URL}/books`;
      const method = editingBook ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          ...formData,
          isbn,
          category: finalCategory,
          total_copies: Number(formData.total_copies),
          available_copies: Number(formData.available_copies),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success(editingBook ? "Book updated" : "Book added");
      handleCloseModal();
      fetchBooksAndStats(); // Refresh data to update stats immediately
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (book) => {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/books/${book._id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Book deleted");
      fetchBooksAndStats(); // Refresh data to update stats immediately
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Full-Page PIN Gate
  if (!isUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Toaster position="top-right" />
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-[#1B3A6B] rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-base">Restricted Access</h3>
            <p className="text-xs text-gray-500 mt-1">Enter your 4-digit staff PIN to access book management</p>
          </div>
          <form onSubmit={handlePinSubmit} className="space-y-3">
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="****"
              className="w-full text-center tracking-widest text-2xl font-mono border border-gray-300 rounded-xl p-2 focus:ring-2 focus:ring-[#1B3A6B] outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={pinLoading || pinInput.length !== 4}
              className="w-full bg-[#1B3A6B] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-900 transition disabled:opacity-50"
            >
              {pinLoading ? "Verifying..." : "Unlock Section"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Manage Books</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-[#1B3A6B] hover:bg-[#142d54] text-white px-4 py-2 rounded-xl flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Book
        </button>
      </div>

      {/* Dynamic Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-[#1B3A6B] rounded-lg">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Books</p>
            <p className="text-2xl font-bold text-[#1B3A6B]">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-700 rounded-lg">
            <BookDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Available</p>
            <p className="text-2xl font-bold text-green-700">{stats.available}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg">
            <BookUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Borrowed</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.borrowed}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-700 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Overdue</p>
            <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, author or ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#1B3A6B] text-white">
            <tr>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Author</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">ISBN</th>
              <th className="p-3 text-left">Published</th>
              <th className="p-3 text-center">Total</th>
              <th className="p-3 text-center">Available</th>
              <th className="p-3 text-center">Borrowed</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="text-center py-8">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && filteredBooks.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500">
                  No books found.
                </td>
              </tr>
            )}
            {filteredBooks.map((book) => (
              <tr key={book._id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{book.title}</td>
                <td className="p-3">{book.author || "—"}</td>
                <td className="p-3">{book.category || "—"}</td>
                <td className="p-3">{book.isbn || "—"}</td>
                <td className="p-3">{book.date_published || "—"}</td>
                <td className="p-3 text-center">{book.total_copies}</td>
                <td className="p-3 text-center">{book.available_copies}</td>
                <td className="p-3 text-center">
                  {book.total_copies - book.available_copies}
                </td>
                <td className="p-3 text-center space-x-2">
                  <button
                    onClick={() => handleOpenModal(book)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(book)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#1B3A6B]">
                {editingBook ? "Edit Book" : "Add New Book"}
              </h2>
              <button onClick={handleCloseModal}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ISBN <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleIsbnLookup();
                      }
                    }}
                    placeholder="Type the ISBN (10 or 13 digits)"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                  <button
                    type="button"
                    onClick={handleIsbnLookup}
                    disabled={lookupLoading}
                    className="px-3 py-2 bg-[#1B3A6B] text-white rounded-lg text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {lookupLoading ? "Searching..." : "Look up"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Type the ISBN, then press Enter or click Look up to fill in the details automatically.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={isOtherCategory ? OTHERS_VALUE : formData.category}
                  onChange={handleCategorySelect}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value={OTHERS_VALUE}>Others</option>
                </select>
                {isOtherCategory && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Type the category"
                    className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publisher
                  </label>
                  <input
                    type="text"
                    name="publisher"
                    value={formData.publisher}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Published
                  </label>
                  <input
                    type="text"
                    name="date_published"
                    value={formData.date_published}
                    onChange={handleInputChange}
                    placeholder="e.g. 2019"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Copies
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="total_copies"
                    value={formData.total_copies}
                    onChange={handleInputChange}
                    placeholder="e.g. 5"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available Copies
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="available_copies"
                    value={formData.available_copies}
                    onChange={handleInputChange}
                    placeholder="e.g. 5"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#1B3A6B] text-white rounded-lg disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingBook ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
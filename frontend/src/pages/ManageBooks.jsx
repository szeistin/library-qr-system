import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Search, Library, BookUp, BookDown, AlertCircle } from "lucide-react";
import { Toaster, toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL;

export default function ManageBooks() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    category: "",
    total_copies: 1,
    available_copies: 1,
  });
  const [loading, setLoading] = useState(false);
  
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
    fetchBooksAndStats();
  }, []);

  const filteredBooks = books
    .filter((book) => {
      const matchesSearch =
        searchTerm === "" ||
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase());
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
      setEditingBook(book);
      setFormData({
        title: book.title,
        author: book.author || "",
        category: book.category || "",
        total_copies: book.total_copies,
        available_copies: book.available_copies,
      });
    } else {
      setEditingBook(null);
      setFormData({
        title: "",
        author: "",
        category: "",
        total_copies: 1,
        available_copies: 1,
      });
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
      total_copies: 1,
      available_copies: 1,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Ensure numbers for copies
    const val = name.includes('copies') ? Number(value) : value;
    setFormData({ ...formData, [name]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingBook
        ? `${API_URL}/books/${editingBook._id}`
        : `${API_URL}/books`;
      const method = editingBook ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
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
            placeholder="Search by title or author..."
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
              <th className="p-3 text-center">Total</th>
              <th className="p-3 text-center">Available</th>
              <th className="p-3 text-center">Borrowed</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && filteredBooks.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  No books found.
                </td>
              </tr>
            )}
            {filteredBooks.map((book) => (
              <tr key={book._id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{book.title}</td>
                <td className="p-3">{book.author || "—"}</td>
                <td className="p-3">{book.category || "—"}</td>
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
          <div className="bg-white rounded-xl max-w-md w-full p-6">
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
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Copies
                  </label>
                  <input
                    type="number"
                    name="total_copies"
                    value={formData.total_copies}
                    onChange={handleInputChange}
                    min="1"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available Copies
                  </label>
                  <input
                    type="number"
                    name="available_copies"
                    value={formData.available_copies}
                    onChange={handleInputChange}
                    min="0"
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
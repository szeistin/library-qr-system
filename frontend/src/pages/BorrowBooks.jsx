import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { searchBooks, getCategories, getRecommendedBooks } from "../api/api";
import { ArrowLeft, Search, ChevronDown, BookOpen, Star, Check } from "lucide-react";

export default function BorrowBooks() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visitor, setVisitor] = useState(null);
  const [books, setBooks] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [activeTab, setActiveTab] = useState("available");
  const [loading, setLoading] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState([]);

  // Read state passed from VisitorHome recommendations click
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    if (location.state?.selectedBook) {
      const bookToSelect = location.state.selectedBook;
      
      // Auto-select the book if it's available
      if (bookToSelect.available_copies === undefined || bookToSelect.available_copies > 0) {
        setSelectedBooks((prev) => {
          const alreadyExists = prev.some((b) => b._id === bookToSelect._id);
          if (!alreadyExists && prev.length < 3) {
            return [...prev, bookToSelect];
          }
          return prev;
        });
      }
    }
  }, [location.state]);

  useEffect(() => {
    const stored = localStorage.getItem("visitor");
    if (!stored) {
      navigate("/");
      return;
    }
    setVisitor(JSON.parse(stored));
  }, [navigate]);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const data = await searchBooks(searchTerm, selectedCategory);
        const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title));
        setBooks(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    getCategories()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.localeCompare(b));
        setCategories(sorted);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (visitor?.dob) {
      getRecommendedBooks(visitor.dob)
        .then((data) => {
          const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title));
          setRecommended(sorted);
        })
        .catch(console.error);
    }
  }, [visitor]);

  const getFilteredBooks = () => {
    let list = [];
    if (activeTab === "recommended") {
      list = recommended;
    } else if (activeTab === "available") {
      list = books.filter((b) => b.available_copies > 0);
    } else {
      list = books.filter((b) => b.available_copies === 0);
    }
    return [...list].sort((a, b) => a.title.localeCompare(b.title));
  };

  const getGroupedBooks = () => {
    let allBooks = [];
    if (activeTab === "recommended") {
      allBooks = recommended;
    } else if (activeTab === "available") {
      allBooks = books.filter((b) => b.available_copies > 0);
    } else {
      allBooks = books.filter((b) => b.available_copies === 0);
    }
    
    if (selectedCategory) {
      return null;
    }

    const grouped = {};
    
    allBooks.forEach((book) => {
      const category = book.category || "Uncategorized";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(book);
    });

    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map((category) => ({
        category,
        books: grouped[category],
      }));
  };

  const toggleBookSelection = (book) => {
    if (book.available_copies === 0) return;
    const isAlreadySelected = selectedBooks.some((b) => b._id === book._id);
    if (isAlreadySelected) {
      setSelectedBooks(selectedBooks.filter((b) => b._id !== book._id));
    } else {
      if (selectedBooks.length >= 3) {
        alert("You can only borrow up to 3 books at a time.");
        return;
      }
      setSelectedBooks([...selectedBooks, book]);
    }
  };

  const handleBorrow = () => {
    if (selectedBooks.length === 0) return;
    navigate("/mobile/confirm-borrow", { state: { books: selectedBooks } });
  };

  if (!visitor) return null;

  const showGrouped = activeTab !== "recommended" && !selectedCategory;
  const groupedBooks = showGrouped ? getGroupedBooks() : null;
  const flatBooks = !showGrouped ? getFilteredBooks() : [];

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gray-50 overflow-hidden">
      
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-white text-sm font-bold">BORROW A BOOK</p>
              <p className="text-blue-200 text-xs">Select up to 3 books</p>
            </div>
          </div>
          {selectedBooks.length > 0 && (
            <div className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg">
              {selectedBooks.length}/3 selected
            </div>
          )}
        </div>
      </div>

      {/* Filters and Tabs */}
      <div className="px-4 pt-4 pb-2 space-y-4 flex-shrink-0 bg-gray-50">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or author"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {["available", "recommended", "unavailable"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium ${
                activeTab === tab
                  ? "border-b-2 border-[#1B3A6B] text-[#1B3A6B]"
                  : "text-gray-500"
              }`}
            >
              {tab === "available" ? "Available" : tab === "recommended" ? "Recommended" : "Unavailable"}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Book List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-400 text-sm py-8">Loading...</div>
        ) : (
          <>
            {/* Grouped Books Layout */}
            {showGrouped && groupedBooks ? (
              groupedBooks.length > 0 ? (
                groupedBooks.map((group) => (
                  <div key={group.category} className="mb-6">
                    <div className="bg-[#EBF0F7] rounded-xl px-3 py-1.5 mb-3 sticky top-0 z-10">
                      <p className="text-[#1B3A6B] text-xs font-bold uppercase tracking-wider">
                        {group.category}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {group.books.map((book) => {
                        const isSelected = selectedBooks.some((b) => b._id === book._id);
                        const isAvailable = book.available_copies > 0;
                        return (
                          <div
                            key={book._id}
                            onClick={() => isAvailable && toggleBookSelection(book)}
                            className={`bg-white rounded-xl p-3 border-2 transition-all cursor-pointer ${
                              isSelected ? "border-[#1B3A6B] shadow-md" : "border-gray-100"
                            } ${!isAvailable ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-12 bg-gradient-to-b from-[#1B3A6B] to-[#2a5298] rounded-lg flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[#1B3A6B] text-xs font-bold truncate">{book.title}</p>
                                <p className="text-gray-400 text-xs">{book.author}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs bg-[#EBF0F7] text-[#1B3A6B] px-2 py-0.5 rounded-full">
                                    {book.category}
                                  </span>
                                  {book.borrowCount > 0 && (
                                    <div className="flex items-center gap-0.5">
                                      <Star className="w-3 h-3 text-[#C9A227] fill-[#C9A227]" />
                                      <span className="text-xs text-gray-500">{book.borrowCount} borrows</span>
                                    </div>
                                  )}
                                  {isAvailable && (
                                    <span className="text-xs text-gray-500">({book.available_copies} available)</span>
                                  )}
                                </div>
                              </div>
                              {isAvailable ? (
                                isSelected ? (
                                  <Check className="w-5 h-5 text-[#1B3A6B] flex-shrink-0" />
                                ) : (
                                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">Available</span>
                                )
                              ) : (
                                <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0">Unavailable</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 text-sm py-8">No books found.</div>
              )
            ) : null}

            {/* Flat Books Layout */}
            {!showGrouped && (
              flatBooks.length > 0 ? (
                <div className="space-y-2">
                  {flatBooks.map((book) => {
                    const isSelected = selectedBooks.some((b) => b._id === book._id);
                    const isAvailable = book.available_copies === undefined || book.available_copies > 0;
                    return (
                      <div
                        key={book._id}
                        onClick={() => isAvailable && toggleBookSelection(book)}
                        className={`bg-white rounded-xl p-3 border-2 transition-all cursor-pointer ${
                          isSelected ? "border-[#1B3A6B] shadow-md" : "border-gray-100"
                        } ${!isAvailable ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-12 bg-gradient-to-b from-[#1B3A6B] to-[#2a5298] rounded-lg flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#1B3A6B] text-xs font-bold truncate">{book.title}</p>
                            <p className="text-gray-400 text-xs">{book.author}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs bg-[#EBF0F7] text-[#1B3A6B] px-2 py-0.5 rounded-full">{book.category}</span>
                              {book.borrowCount > 0 && (
                                <div className="flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-[#C9A227] fill-[#C9A227]" />
                                  <span className="text-xs text-gray-500">{book.borrowCount} borrows</span>
                                </div>
                              )}
                              {isAvailable && book.available_copies !== undefined && (
                                <span className="text-xs text-gray-500">({book.available_copies} available)</span>
                              )}
                            </div>
                          </div>
                          {isAvailable ? (
                            isSelected ? (
                              <Check className="w-5 h-5 text-[#1B3A6B] flex-shrink-0" />
                            ) : (
                              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">Available</span>
                            )
                          ) : (
                            <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0">Unavailable</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-400 text-sm py-8">No books found.</div>
              )
            )}
          </>
        )}
      </div>

      {/* Bottom Borrow Button */}
      {selectedBooks.length > 0 && (
        <div className="w-full bg-white border-t border-gray-100 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex-shrink-0 z-20">
          <button
            onClick={handleBorrow}
            className="w-full bg-[#1B3A6B] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
          >
            <BookOpen className="w-4 h-4" /> Borrow Selected Books ({selectedBooks.length})
          </button>
        </div>
      )}
    </div>
  );
}
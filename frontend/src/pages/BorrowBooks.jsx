import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { searchBooks, getCategories, getRecommendedBooks } from "../api/api";
import { ArrowLeft, Search, ChevronDown, BookOpen, Star, Check } from "lucide-react";

export default function BorrowBooks() {
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState(null);
  const [books, setBooks] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [activeTab, setActiveTab] = useState("available");
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

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
        setBooks(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchBooks();
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    if (visitor?.dob) {
      getRecommendedBooks(visitor.dob).then(setRecommended).catch(console.error);
    }
  }, [visitor]);

  const filteredBooks = () => {
    if (activeTab === "recommended") return recommended;
    if (activeTab === "available") return books.filter(b => b.available_copies > 0);
    if (activeTab === "unavailable") return books.filter(b => b.available_copies === 0);
    return books;
  };

  const handleBorrow = () => {
    if (selectedBook) navigate("/mobile/confirm-borrow", { state: { book: selectedBook } });
  };

  if (!visitor) return null;

  return (
    <>
      <div className="bg-[#1B3A6B] px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-white text-sm font-bold">BORROW A BOOK</p>
            <p className="text-blue-200 text-xs">Search from our collection</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or author"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
          />
        </div>

        <div className="relative">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
          >
            <option value="">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex border-b border-gray-200">
          {["available", "recommended", "unavailable"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium ${activeTab === tab ? "border-b-2 border-[#1B3A6B] text-[#1B3A6B]" : "text-gray-500"}`}
            >
              {tab === "available" ? "Available" : tab === "recommended" ? "Recommended" : "Unavailable"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 text-sm py-4">Loading...</div>
        ) : (
          <div className="space-y-3">
            {filteredBooks().map(book => {
              const isSelected = selectedBook?._id === book._id;
              const isAvailable = book.available_copies > 0;
              return (
                <div
                  key={book._id}
                  onClick={() => isAvailable && setSelectedBook(isSelected ? null : book)}
                  className={`bg-white rounded-xl p-3 border-2 transition-all cursor-pointer ${isSelected ? "border-[#1B3A6B] shadow-md" : "border-gray-100"} ${!isAvailable ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-12 bg-gradient-to-b from-[#1B3A6B] to-[#2a5298] rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[#1B3A6B] text-xs font-bold truncate">{book.title}</p>
                      <p className="text-gray-400 text-xs">{book.author}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-[#EBF0F7] text-[#1B3A6B] px-2 py-0.5 rounded-full">{book.category}</span>
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-[#C9A227] fill-[#C9A227]" />
                          <span className="text-xs text-gray-500">{book.borrowCount || 0} borrows</span>
                        </div>
                      </div>
                    </div>
                    {isAvailable ? (
                      isSelected ? (
                        <Check className="w-5 h-5 text-[#1B3A6B]" />
                      ) : (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Available</span>
                      )
                    ) : (
                      <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Unavailable</span>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredBooks().length === 0 && <div className="text-center text-gray-400 text-sm py-4">No books found.</div>}
          </div>
        )}
      </div>

      {selectedBook && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 shadow-lg">
          <button
            onClick={handleBorrow}
            className="w-full bg-[#1B3A6B] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" /> Borrow "{selectedBook.title}"
          </button>
        </div>
      )}
    </>
  );
}
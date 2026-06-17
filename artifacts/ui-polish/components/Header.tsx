'use client';

import { useState } from 'react';
import { Search, Menu, X, ShoppingCart, User } from 'lucide-react';

interface HeaderProps {
  onSearch?: (query: string) => void;
  cartCount?: number;
  onMenuToggle?: (open: boolean) => void;
}

/**
 * Refactored Header
 * - Full-width search bar (Amazon-style)
 * - Reduced clutter: Auto Pilot button removed
 * - Responsive mobile menu
 * - High contrast for accessibility
 */

export function Header({ onSearch, cartCount = 0, onMenuToggle }: HeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    onMenuToggle?.(newState);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
      {/* Top Bar: Logo + Mobile Menu Button */}
      <div className="px-4 py-3 flex items-center justify-between lg:hidden">
        <h1 className="text-lg font-bold text-primary-600">Givit</h1>
        <button
          onClick={toggleMobileMenu}
          className="p-2 text-gray-700 hover:bg-gray-100 rounded transition"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between px-6 py-4 gap-6">
        {/* Logo */}
        <h1 className="text-xl font-bold text-primary-600 whitespace-nowrap">Givit</h1>

        {/* Full-Width Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl">
          <div
            className={`relative flex items-center px-4 py-3 bg-gray-100 rounded-base border-2 transition ${
              isSearchFocused
                ? 'border-primary-500 bg-white'
                : 'border-transparent hover:bg-gray-200'
            }`}
          >
            <Search className="text-gray-400 flex-shrink-0" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search gifts by category, interest, or budget..."
              className="flex-1 ml-3 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              className="ml-2 px-4 py-2 bg-primary-600 text-white rounded font-semibold hover:bg-primary-700 transition text-sm whitespace-nowrap"
            >
              Search
            </button>
          </div>
        </form>

        {/* Right Actions: Cart + Account */}
        <nav className="flex items-center gap-4">
          {/* Cart */}
          <button
            className="relative p-2 text-gray-700 hover:text-primary-600 hover:bg-gray-100 rounded transition"
            aria-label="Shopping cart"
          >
            <ShoppingCart size={24} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* Account Dropdown (Placeholder) */}
          <button
            className="p-2 text-gray-700 hover:text-primary-600 hover:bg-gray-100 rounded transition"
            aria-label="Account menu"
          >
            <User size={24} />
          </button>
        </nav>
      </div>

      {/* Mobile Search */}
      <div className="lg:hidden px-4 py-3 border-t border-gray-200">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1 flex items-center px-3 py-2 bg-gray-100 rounded-base border border-gray-300">
            <Search className="text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gifts..."
              className="flex-1 ml-2 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-primary-600 text-white rounded font-semibold hover:bg-primary-700 transition"
          >
            Go
          </button>
        </form>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <nav className="lg:hidden px-4 py-3 border-t border-gray-200 space-y-2">
          <a
            href="/gifts"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
          >
            Marketplace
          </a>
          <a
            href="/boards"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
          >
            Gift Boards
          </a>
          <a
            href="/autogift"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
          >
            AutoGift
          </a>
          <a
            href="/concierge"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
          >
            Concierge
          </a>
        </nav>
      )}
    </header>
  );
}

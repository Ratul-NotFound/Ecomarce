'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Search, X, ArrowRight, Package, TrendingUp, Sparkles, Folder } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  isMobile?: boolean;
}

export default function SearchBar({
  placeholder = 'Search products, brands, categories...',
  className = '',
  isMobile = false,
}: SearchBarProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    products: any[];
    categories: any[];
    suggestions: string[];
    popular_searches?: string[];
    total_matches?: number;
  }>({
    products: [],
    categories: [],
    suggestions: [],
    popular_searches: [],
    total_matches: 0,
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced auto-fetch recommendations
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(searchTerm.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setResults(data);
          }
        }
      } catch (err) {
        console.warn('Search suggest error:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleSelectQuery = (query: string) => {
    setSearchTerm(query);
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div
      ref={wrapperRef}
      className={`search-bar-wrapper ${className}`}
      style={{ position: 'relative', width: '100%' }}
    >
      <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%' }}>
        <Search
          size={16}
          color="var(--color-text-muted)"
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          aria-label="Search"
          className="store-header__search-input"
          style={{
            width: '100%',
            height: isMobile ? '40px' : '42px',
            paddingLeft: '38px',
            paddingRight: searchTerm ? '36px' : '14px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
            fontSize: isMobile ? '13px' : '13.5px',
            color: 'var(--color-text-primary)',
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
        />

        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              inputRef.current?.focus();
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
          >
            <X size={14} />
          </button>
        )}
      </form>

      {/* Auto-suggest & Recommendation Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
            zIndex: 1000,
            overflow: 'hidden',
            maxHeight: '420px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            animation: 'dropdownFadeIn 0.15s ease',
          }}
        >
          {/* 1. Keyword Recommendations / Popular Searches */}
          {searchTerm.trim() ? (
            results.suggestions.length > 0 && (
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Suggestions
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {results.suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectQuery(sug)}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Sparkles size={11} color="var(--color-primary)" />
                      <span>{sug}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            results.popular_searches && results.popular_searches.length > 0 && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  <TrendingUp size={12} />
                  <span>Trending Searches</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {results.popular_searches.map((term, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectQuery(term)}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}

          {/* 2. Matching Categories */}
          {results.categories.length > 0 && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Categories
              </div>
              {results.categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/search?category=${cat.slug}`}
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    textDecoration: 'none',
                  }}
                  className="search-item-hover"
                >
                  <Folder size={14} color="var(--color-primary)" />
                  <span>{cat.name_en}</span>
                </Link>
              ))}
            </div>
          )}

          {/* 3. Matching Products List */}
          {results.products.length > 0 ? (
            <div style={{ padding: '6px 8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 8px' }}>
                Products
              </div>
              {results.products.map(prod => {
                const img = prod.images?.[0];
                return (
                  <Link
                    key={prod.id}
                    href={`/products/${prod.slug}`}
                    onClick={() => setIsOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '8px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      transition: 'background 0.15s ease',
                    }}
                    className="search-item-hover"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          minWidth: '36px',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          position: 'relative',
                          overflow: 'hidden',
                          border: '1px solid var(--color-border)',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {img ? (
                          <Image src={img} alt={prod.name_en} fill sizes="36px" style={{ objectFit: 'cover' }} />
                        ) : (
                          <Package size={16} color="var(--color-text-muted)" />
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {prod.name_en}
                        </div>
                        {prod.category?.name_en && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            in {prod.category.name_en}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)', flexShrink: 0 }}>
                      {formatCurrency(prod.base_price)}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            searchTerm.trim() &&
            !isLoading && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                No direct matches for &quot;{searchTerm}&quot;
              </div>
            )
          )}

          {/* 4. Full Search CTA Footer */}
          {searchTerm.trim() && (
            <div
              style={{
                padding: '10px 14px',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                textAlign: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>
                  See all {results.total_matches !== undefined && results.total_matches > 0 ? `${results.total_matches} ` : ''}results for &quot;{searchTerm}&quot;
                </span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

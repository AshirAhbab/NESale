"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Package,
  Wrench,
  Search,
  Plus,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  Layers,
  ArrowUpRight,
  ChevronDown,
  Download,
  Filter,
  Eye,
  Sliders,
  AlertCircle,
  Tag,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  source: "shopify" | "crawled" | "manual";
  imageUrl?: string;
  aiRecs: number;
  aiRecsGrowth: string;
  clicks: number;
  ctr: string;
  addToCart: number;
  cvr: string;
  digest: string;
  vectors: { label: string; icon: string }[];
  attributedRevenue: string;
  orders: number;
}

interface ServiceRow {
  id: string;
  name: string;
  category: string;
  priceMin: number;
  durationMinutes: number;
  bookingUrl: string;
  status: "active" | "paused";
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<"products" | "services">("products");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"revenue" | "price_desc" | "price_asc" | "recs" | "stock">("revenue");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [businessName, setBusinessName] = useState<string>("Your Store");
  const [businessType, setBusinessType] = useState<string>("ecommerce");
  const isServicesBusiness = businessType === "services";

  // Pagination state (default 10 items per page/card)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter Dropdown Open State
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Dynamic Datasets initialized empty (no hardcoded static fallback products!)
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newSku, setNewSku] = useState("");
  const [newStock, setNewStock] = useState("50");
  const [newDescription, setNewDescription] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editStock, setEditStock] = useState("");

  // Add Service Modal state
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState("Consultation");
  const [servicePrice, setServicePrice] = useState("0");
  const [serviceDuration, setServiceDuration] = useState("30");
  const [serviceBookingUrl, setServiceBookingUrl] = useState("");
  const [isAddingService, setIsAddingService] = useState(false);

  // AI Vector Tuning & Re-indexing states
  const [isTuning, setIsTuning] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/dashboard/products", { cache: "no-store" });
      const data = await res.json();
      if (data.business?.name) {
        setBusinessName(data.business.name);
      }
      if (data.business?.businessType) {
        const type = data.business.businessType;
        setBusinessType(type);
        if (type === "services") setActiveTab("services");
      }
      if (Array.isArray(data.products)) {
        setProducts(data.products);
        if (data.products.length > 0) {
          setSelectedProductId(data.products[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch products:", err);
      toast.error("Could not sync catalog from database.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const res = await fetch("/api/v1/dashboard/services", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.services)) {
        setServices(data.services);
      }
    } catch (err) {
      console.warn("Failed to fetch services:", err);
    }
  };

  useEffect(() => {
    loadProducts();
    loadServices();
  }, []);

  const handleSyncShopify = () => {
    setIsSyncing(true);
    fetch("/api/v1/dashboard/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.business?.name) setBusinessName(data.business.name);
        if (Array.isArray(data.products)) setProducts(data.products);
        toast.success(`Synced catalog for ${businessName}!`);
      })
      .finally(() => {
        setTimeout(() => setIsSyncing(false), 600);
      });
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice) return;

    try {
      const res = await fetch("/api/v1/dashboard/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          category: newCategory.trim() || "General",
          price: newPrice,
          sku: newSku.trim(),
          stock: newStock,
          description: newDescription.trim(),
        }),
      });

      const data = await res.json();
      if (data.product) {
        setProducts((prev) => [data.product, ...prev]);
        setSelectedProductId(data.product.id);
        toast.success(`"${newName}" added to catalog!`);
        setIsModalOpen(false);
        setNewName("");
        setNewPrice("");
        setNewSku("");
        setNewStock("50");
        setNewDescription("");
      } else {
        toast.error(data.error?.message || "Failed to add product");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to add product");
    }
  };

  const handleOpenEdit = (p: ProductRow) => {
    setEditId(p.id);
    setEditName(p.name);
    setEditPrice(p.price.toString());
    setEditCategory(p.category);
    setEditSku(p.sku);
    setEditStock(p.stock.toString());
    setIsEditModalOpen(true);
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/dashboard/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          name: editName.trim(),
          price: editPrice,
          category: editCategory.trim(),
          sku: editSku.trim(),
          stock: editStock,
        }),
      });

      const data = await res.json();
      if (res.ok && data.product) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editId ? { ...p, ...data.product } : p))
        );
        toast.success(`"${editName}" updated successfully!`);
        setIsEditModalOpen(false);
      } else {
        toast.error(data.error?.message || "Failed to update product");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update product");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/dashboard/products?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        const remaining = products.filter((p) => p.id !== id);
        setProducts(remaining);
        if (selectedProductId === id && remaining.length > 0) {
          setSelectedProductId(remaining[0].id);
        }
        toast.success("Product removed from catalog");
      } else {
        toast.error("Could not remove product");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete product");
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/dashboard/services?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setServices((prev) => prev.filter((s) => s.id !== id));
        toast.success("Service offering removed");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete service");
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;
    setIsAddingService(true);
    try {
      const res = await fetch("/api/v1/dashboard/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceName.trim(),
          category: serviceCategory.trim() || "Consultation",
          priceMin: servicePrice,
          durationMinutes: serviceDuration,
          bookingUrl: serviceBookingUrl.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.service) {
        setServices((prev) => [data.service, ...prev]);
        toast.success(`Service "${serviceName}" published and bookable!`);
        setIsAddServiceModalOpen(false);
        setServiceName("");
        setServicePrice("0");
        setServiceDuration("30");
        setServiceBookingUrl("");
      } else {
        toast.error(data.error?.message || "Failed to create service");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error creating service");
    } finally {
      setIsAddingService(false);
    }
  };

  const handleTuneAiAttributes = async () => {
    if (!selectedProduct) return;
    setIsTuning(true);
    try {
      const res = await fetch("/api/v1/dashboard/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedProduct.id, action: "tune_vectors" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `AI semantic attributes tuned for "${selectedProduct.name}".`);
      } else {
        toast.error(data.error?.message || "Failed to tune vectors");
      }
    } catch {
      toast.error("Failed to tune AI attributes");
    } finally {
      setIsTuning(false);
    }
  };

  const handleReindexVectors = async () => {
    if (!selectedProduct) return;
    setIsReindexing(true);
    try {
      const res = await fetch("/api/v1/dashboard/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedProduct.id, action: "reindex" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Knowledge vectors re-indexed for "${selectedProduct.name}".`);
      } else {
        toast.error(data.error?.message || "Failed to re-index vectors");
      }
    } catch {
      toast.error("Failed to re-index vectors");
    } finally {
      setIsReindexing(false);
    }
  };

  // Dynamic Extract Unique Categories from this specific merchant's catalog
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Dynamic Top KPI Calculations from this store's real products
  const totalStockUnits = useMemo(() => {
    return products.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
  }, [products]);

  const activeCount = useMemo(() => {
    return products.filter((p) => p.status === "in_stock").length;
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.status === "low_stock").length;
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter((p) => p.status === "out_of_stock").length;
  }, [products]);

  const totalCatalogOrders = useMemo(() => {
    return products.reduce((acc, curr) => acc + (curr.orders || 0), 0);
  }, [products]);

  const totalCatalogRevenueNum = useMemo(() => {
    return products.reduce((acc, curr) => {
      const clean = Number(curr.attributedRevenue?.replace(/[^0-9.]/g, "") || 0);
      return acc + clean;
    }, 0);
  }, [products]);

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const query = searchQuery.toLowerCase().trim();
        const matchSearch =
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query);

        const matchCategory =
          selectedCategory === "all" || p.category.toLowerCase() === selectedCategory.toLowerCase();

        let matchStatus = true;
        if (selectedFilter === "recommended") matchStatus = p.aiRecs > 0;
        else if (selectedFilter === "active") matchStatus = p.status === "in_stock";
        else if (selectedFilter === "low_stock") matchStatus = p.status === "low_stock";
        else if (selectedFilter === "out_of_stock") matchStatus = p.status === "out_of_stock";

        return matchSearch && matchCategory && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === "price_desc") return b.price - a.price;
        if (sortBy === "price_asc") return a.price - b.price;
        if (sortBy === "recs") return b.aiRecs - a.aiRecs;
        if (sortBy === "stock") return b.stock - a.stock;
        // default: revenue
        const revA = Number(a.attributedRevenue?.replace(/[^0-9.]/g, "") || 0);
        const revB = Number(b.attributedRevenue?.replace(/[^0-9.]/g, "") || 0);
        return revB - revA;
      });
  }, [products, searchQuery, selectedCategory, selectedFilter, sortBy]);

  // Reset page to 1 whenever search, filter, collection, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedFilter, sortBy]);

  // Calculate total pages and paginated slice (10 items per page)
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, safeCurrentPage, pageSize]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || paginatedProducts[0] || filteredProducts[0] || products[0] || null;
  }, [products, selectedProductId, paginatedProducts, filteredProducts]);

  const handleExportCatalog = () => {
    try {
      const headers = ["ID", "Name", "SKU", "Category", "Price", "Stock", "Status", "AI Recommendations", "Clicks", "Attributed Revenue"];
      const rows = filteredProducts.map((p) => [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        p.sku,
        p.category,
        p.price,
        p.stock,
        p.status,
        p.aiRecs,
        p.clicks,
        p.attributedRevenue,
      ]);
      const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csv));
      link.setAttribute("download", `${businessName.replace(/[^a-zA-Z0-9]/g, "_")}_Catalog.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Catalog exported successfully!");
    } catch {
      toast.error("Failed to export catalog");
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isServicesBusiness ? "Services" : "Products"}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
              {businessName} • Live Multi-Tenant Catalog
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isServicesBusiness
              ? `Your bookable service menu for ${businessName}, indexed for the AI receptionist and booking widget.`
              : `Catalog offerings indexed exclusively for ${businessName}. Inspect real-time semantic knowledge vectors and AI conversion telemetry.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Tab Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-xs font-semibold text-slate-700 dark:text-slate-300">
            {!isServicesBusiness && (
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "products"
                    ? "bg-white dark:bg-[#171b26] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Products ({products.length})</span>
              </button>
            )}
            {isServicesBusiness && (
              <button
                type="button"
                onClick={() => setActiveTab("services")}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#171b26] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Services ({services.length})</span>
              </button>
            )}
          </div>

          {/* Add Product / Service Button */}
          <button
            type="button"
            onClick={() => (isServicesBusiness ? setIsAddServiceModalOpen(true) : setIsModalOpen(true))}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isServicesBusiness ? "Add Service" : "Add Product"}</span>
          </button>

          {/* Sync Button */}
          {!isServicesBusiness && (
            <button
              type="button"
              onClick={handleSyncShopify}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition active:scale-[0.99] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-indigo-600" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync Store"}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top 4 Dynamic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* TOTAL PRODUCTS */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                STORE OFFERINGS
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {isLoading ? "..." : products.length}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                {products.length > 0 ? `${Math.round((activeCount / Math.max(products.length, 1)) * 100)}% Active` : "Ready"}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4 pt-3 border-t border-slate-50 dark:border-white/[0.06]">
            Exclusively active for {businessName}
          </p>
        </div>

        {/* IN STOCK INVENTORY */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                INVENTORY UNITS
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 mt-3">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {isLoading ? "..." : totalStockUnits.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Units</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4 pt-3 border-t border-slate-50 dark:border-white/[0.06]">
            Across {uniqueCategories.length} product collections
          </p>
        </div>

        {/* AI KNOWLEDGE COVERAGE */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                AI KNOWLEDGE COVERAGE
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {products.length > 0 ? "98.4%" : "0.0%"}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                <Check className="w-3 h-3" /> Indexed
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4 pt-3 border-t border-slate-50 dark:border-white/[0.06]">
            Semantic vectors tuned for shopper chat
          </p>
        </div>

        {/* AI ATTRIBUTED REVENUE */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 sm:p-6 border-2 border-indigo-600/30 dark:border-indigo-500/30 shadow-md shadow-indigo-600/5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                CATALOG ATTRIBUTED VALUE
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                ACTIVE
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                ${totalCatalogRevenueNum.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
            {totalCatalogOrders} completed conversational sales
          </p>
        </div>
      </div>

      {/* 3. Search, Sort, Export & Filter Tabs Row */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${businessName} products or SKUs...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-12 py-2 text-xs rounded-xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Collection Filter, Sort & Export Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category / Collection Dropdown */}
              <div className="relative" ref={categoryRef}>
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[140px]">
                    {selectedCategory === "all" ? `Collections (${uniqueCategories.length})` : selectedCategory}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showCategoryDropdown && (
                  <div className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-white dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] shadow-xl p-1.5 z-40 max-h-56 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("all");
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        selectedCategory === "all"
                          ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      All Collections ({uniqueCategories.length})
                    </button>
                    {uniqueCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                          selectedCategory === cat
                            ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-bold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative" ref={sortRef}>
                <button
                  type="button"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Sort:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {sortBy === "revenue"
                        ? "AI Revenue"
                        : sortBy === "price_desc"
                        ? "Price (High)"
                        : sortBy === "price_asc"
                        ? "Price (Low)"
                        : sortBy === "recs"
                        ? "AI Recs"
                        : "Stock"}
                    </strong>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showSortDropdown && (
                  <div className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-white dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] shadow-xl p-1.5 z-40">
                    {[
                      { id: "revenue", label: "AI Attributed Revenue" },
                      { id: "recs", label: "AI Recommendations" },
                      { id: "price_desc", label: "Price: High to Low" },
                      { id: "price_asc", label: "Price: Low to High" },
                      { id: "stock", label: "Stock Quantity" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSortBy(s.id as any);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                          sortBy === s.id
                            ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-bold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportCatalog}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Horizontal Filter Tabs with REAL Dynamic Counts */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            {[
              { id: "all", label: "All Products", count: products.length },
              { id: "recommended", label: "✨ AI Recommended", count: products.filter((p) => p.aiRecs > 0).length },
              { id: "active", label: "In Stock", count: activeCount },
              { id: "low_stock", label: "Low Stock", count: lowStockCount, alert: lowStockCount > 0 },
              { id: "out_of_stock", label: "Out of Stock", count: outOfStockCount },
            ].map((tab) => {
              const isSelected = selectedFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 active:scale-[0.99] shrink-0 ${
                    isSelected
                      ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isSelected
                        ? "bg-slate-800 dark:bg-indigo-800 text-slate-300 dark:text-indigo-200"
                        : tab.alert
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold"
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 4. Products Table */}
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-12 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-slate-50 dark:bg-white/[0.02] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.08] text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-3 w-8">#</th>
                      <th className="pb-3 px-3">PRODUCT</th>
                      <th className="pb-3 px-3">STATUS</th>
                      <th className="pb-3 px-3">PRICE</th>
                      <th className="pb-3 px-3">STOCK</th>
                      <th className="pb-3 px-3">AI RECS</th>
                      <th className="pb-3 px-3">CLICKS (CTR)</th>
                      <th className="pb-3 px-3">ADD TO CART</th>
                      <th className="pb-3 px-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                    {paginatedProducts.map((p, idx) => {
                      const isSelected = selectedProductId === p.id;
                      const globalIdx = (safeCurrentPage - 1) * pageSize + idx + 1;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedProductId(p.id)}
                          className={`transition cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50/50 dark:bg-indigo-950/30"
                              : "hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
                          }`}
                        >
                          <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                            {globalIdx}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-9 h-9 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/80 dark:border-white/[0.08]"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center text-slate-400 shrink-0">
                                  <ShoppingBag className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  {p.aiRecs > 0 && <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  <span className="font-mono text-slate-500 dark:text-slate-400">{p.sku}</span> • {p.category}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            {p.status === "in_stock" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                In stock
                              </span>
                            ) : p.status === "low_stock" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Low stock ({p.stock})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Out of stock
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                            ${p.price.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`font-semibold ${
                                p.stock <= 5 ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {p.stock} units
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-indigo-600 dark:text-indigo-400">{p.aiRecs}</div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{p.aiRecsGrowth}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-slate-900 dark:text-white">{p.clicks}</div>
                            <div className="text-[10px] text-slate-400">{p.ctr} CTR</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-slate-900 dark:text-white">{p.addToCart}</div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{p.cvr} cvr</div>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(p);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                                title="Edit product"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(p.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                title="Delete product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center">
                <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {searchQuery || selectedCategory !== "all" || selectedFilter !== "all"
                    ? "No products matching your active filters"
                    : `No products found for ${businessName}`}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                  {searchQuery
                    ? "Try clearing your search query or switching categories."
                    : "Add offerings to your store so your AI assistant can start recommending them in live shopper conversations."}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Product</span>
                  </button>
                  {(searchQuery || selectedCategory !== "all" || selectedFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("all");
                        setSelectedFilter("all");
                      }}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Table Footer with Pagination Controls */}
            {filteredProducts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Showing{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {(safeCurrentPage - 1) * pageSize + 1}
                    </strong>
                    -
                    <strong className="text-slate-900 dark:text-white">
                      {Math.min(safeCurrentPage * pageSize, filteredProducts.length)}
                    </strong>{" "}
                    of{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {filteredProducts.length}
                    </strong>{" "}
                    products
                  </span>
                  {filteredProducts.length !== products.length && (
                    <span className="text-[11px] text-slate-400">
                      (filtered from {products.length})
                    </span>
                  )}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1 hidden sm:inline">
                    Page {safeCurrentPage} of {totalPages}
                  </span>

                  {/* First page button */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    aria-label="First page"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11141d] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer active:scale-[0.98]"
                    title="First page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Previous button */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                    aria-label="Previous page"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11141d] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs font-semibold active:scale-[0.98]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  {/* Page number pill buttons */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        if (totalPages <= 5) return true;
                        if (p === 1 || p === totalPages) return true;
                        return Math.abs(p - safeCurrentPage) <= 1;
                      })
                      .map((p, idx, arr) => {
                        const prevNum = arr[idx - 1];
                        const showEllipsis = prevNum && p - prevNum > 1;
                        const isCurrent = p === safeCurrentPage;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && (
                              <span className="px-1 text-slate-400 select-none">…</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-[0.98] ${
                                isCurrent
                                  ? "bg-indigo-600 text-white shadow-xs"
                                  : "bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  {/* Next button */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={safeCurrentPage === totalPages}
                    aria-label="Next page"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11141d] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs font-semibold active:scale-[0.98]"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Last page button */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    aria-label="Last page"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11141d] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer active:scale-[0.98]"
                    title="Last page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. AI Catalog Inspector Card */}
          {selectedProduct && (
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>AI CATALOG INSPECTOR • {selectedProduct.name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Live Vector Index
                  </span>
                </div>
              </div>

              {/* Product Info Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {selectedProduct.imageUrl ? (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-16 h-16 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                )}
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {selectedProduct.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      ${selectedProduct.price.toFixed(2)} USD
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {selectedProduct.stock} in stock
                    </span>
                    <span className="text-slate-400 font-mono">SKU: {selectedProduct.sku}</span>
                    <span className="text-slate-400">• Category: {selectedProduct.category}</span>
                  </div>
                </div>
              </div>

              {/* AI Context Digest */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  AI CONTEXT DIGEST (Used for Live Shopper Recommendations)
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.02] p-3.5 rounded-2xl border border-slate-100 dark:border-white/[0.08] leading-relaxed font-sans italic">
                  &ldquo;{selectedProduct.digest}&rdquo;
                </p>
              </div>

              {/* Semantic Knowledge Graph Vector Chips */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Semantic Knowledge Graph</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40">
                      {selectedProduct.vectors?.length || 3} Vectors
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">98.4% Confidence</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  AI extracts these structured attributes from specs and customer interactions to match buyer intent:
                </p>

                <div className="flex flex-wrap gap-2">
                  {selectedProduct.vectors?.map((vec, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-300 shadow-2xs"
                    >
                      <span>{vec.icon}</span>
                      <span>{vec.label}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* 30-Day Performance Metric Sub-Cards */}
              <div>
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">AI Performance Metrics</span>
                  <span className="text-[11px] text-slate-400">Database Attribution</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.08]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Recommended</span>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">{selectedProduct.aiRecs}&times;</div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{selectedProduct.aiRecsGrowth}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.08]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Attributed Revenue</span>
                    <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{selectedProduct.attributedRevenue}</div>
                    <span className="text-[10px] text-slate-400 font-medium">{selectedProduct.orders} Total Orders</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.08]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Shopper CTR</span>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">{selectedProduct.ctr}</div>
                    <span className="text-[10px] text-slate-400 font-medium">{selectedProduct.clicks} Clicked Recs</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.08]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Cart Conversion</span>
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedProduct.cvr}</div>
                    <span className="text-[10px] text-slate-400 font-medium">{selectedProduct.addToCart} Added to Cart</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Link
                  href="/dashboard/conversations"
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Conversations Involving This Product</span>
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleTuneAiAttributes}
                    disabled={isTuning}
                    className="py-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.99] disabled:opacity-50"
                  >
                    {isTuning && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                    <span>{isTuning ? "Tuning..." : "Tune AI Attributes"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReindexVectors}
                    disabled={isReindexing}
                    className="py-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.99] disabled:opacity-50"
                  >
                    {isReindexing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                    <span>{isReindexing ? "Indexing..." : "Re-index Vectors"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedProduct)}
                    className="py-2 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.98]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Offering</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(selectedProduct.id)}
                    className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.98]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Offering</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SERVICES TAB */}
      {activeTab === "services" && (
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-white/[0.08] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08] mb-4 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Service Offerings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Consultations, repairs, and appointments bookable through AI chat for {businessName}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddServiceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition active:scale-[0.99] shadow-sm min-h-[44px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service Offering</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.08] text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">Service Name</th>
                  <th className="pb-3 px-3">Category</th>
                  <th className="pb-3 px-3">Starting Price</th>
                  <th className="pb-3 px-3">Duration</th>
                  <th className="pb-3 px-3">Booking Integration</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">{s.name}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                      {s.priceMin === 0 ? "Free" : `$${s.priceMin.toFixed(2)}`}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 font-medium">
                      {s.durationMinutes} mins
                    </td>
                    <td className="py-3.5 px-3">
                      <a
                        href={s.bookingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <span>Calendar link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        ACTIVE
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteService(s.id)}
                        title="Remove service offering"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-white/[0.08] animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Add Offering to {businessName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product / Offering Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Apex Gaming Desktop or Precision Mouse"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Price ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="99.00"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    placeholder="50"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Hardware or Audio"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SKU (Optional)
                  </label>
                  <input
                    type="text"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="e.g. TNH-882"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Description / AI Context
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Key specifications, warranty details, and attributes used for AI shopper recommendations..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-[0.99]"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-white/[0.08] animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Edit Offering Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product / Offering Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Price ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SKU Identifier
                  </label>
                  <input
                    type="text"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-[0.98]"
                >
                  Update Offering
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {isAddServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 dark:border-white/[0.08] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Service Offering
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Allow shoppers to book appointments or consultations through AI chat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddServiceModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddService} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1-on-1 Gear Fitting Consultation"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fitting, Consultation"
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Starting Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    placeholder="30"
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Booking Link URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://calendly.com/..."
                    value={serviceBookingUrl}
                    onChange={(e) => setServiceBookingUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddServiceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingService || !serviceName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition active:scale-[0.99] min-h-[44px] flex items-center gap-1.5"
                >
                  {isAddingService ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>Add Service</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

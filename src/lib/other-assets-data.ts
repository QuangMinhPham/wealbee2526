// Mock data for other asset types (gold, crypto, bonds, custom assets)

export interface OtherAsset {
  id: string;
  ticker: string;
  name: string;
  assetType: 'gold' | 'crypto' | 'bond' | 'real-estate' | 'custom';
  price: number;
  currency: string;
  category?: string;
  yieldRate?: number; // For bonds and some real estate
  description?: string;
}

export const otherAssets: OtherAsset[] = [
  // Gold
  {
    id: 'gold-1',
    ticker: 'GOLD',
    name: 'Vàng SJC',
    assetType: 'gold',
    price: 76500000, // VND per lượng (37.5g)
    currency: 'VND',
    category: 'Precious Metal',
  },
  {
    id: 'gold-2',
    ticker: 'GOLD-PNJ',
    name: 'Vàng PNJ',
    assetType: 'gold',
    price: 76200000, // VND per lượng
    currency: 'VND',
    category: 'Precious Metal',
  },
  
  // Cryptocurrency
  {
    id: 'crypto-1',
    ticker: 'BTC',
    name: 'Bitcoin',
    assetType: 'crypto',
    price: 2350000000, // VND per BTC (approx $100k)
    currency: 'VND',
    category: 'Cryptocurrency',
  },
  {
    id: 'crypto-2',
    ticker: 'ETH',
    name: 'Ethereum',
    assetType: 'crypto',
    price: 82500000, // VND per ETH (approx $3.5k)
    currency: 'VND',
    category: 'Cryptocurrency',
  },
  {
    id: 'crypto-3',
    ticker: 'USDT',
    name: 'Tether',
    assetType: 'crypto',
    price: 23500, // VND per USDT
    currency: 'VND',
    category: 'Stablecoin',
  },
  
  // Bonds
  {
    id: 'bond-1',
    ticker: 'TPCP-5Y',
    name: 'Trái phiếu Chính phủ 5 năm',
    assetType: 'bond',
    price: 1000000, // VND per bond unit
    currency: 'VND',
    category: 'Government Bond',
    yieldRate: 4.5,
  },
  {
    id: 'bond-2',
    ticker: 'TPCP-10Y',
    name: 'Trái phiếu Chính phủ 10 năm',
    assetType: 'bond',
    price: 1000000,
    currency: 'VND',
    category: 'Government Bond',
    yieldRate: 5.2,
  },
  {
    id: 'bond-3',
    ticker: 'TPDN-VCB',
    name: 'Trái phiếu Vietcombank',
    assetType: 'bond',
    price: 1000000,
    currency: 'VND',
    category: 'Corporate Bond',
    yieldRate: 6.8,
  },
  
  // Real Estate
  {
    id: 're-1',
    ticker: 'RE-HN-01',
    name: 'Căn hộ Hà Nội - Cầu Giấy',
    assetType: 'real-estate',
    price: 3500000000, // 3.5 tỷ VND
    currency: 'VND',
    category: 'Apartment',
    yieldRate: 5.0, // Rental yield
    description: '80m2, 2PN, cho thuê 15tr/tháng',
  },
  {
    id: 're-2',
    ticker: 'RE-HCM-01',
    name: 'Nhà phố TP.HCM - Bình Thạnh',
    assetType: 'real-estate',
    price: 8500000000, // 8.5 tỷ VND
    currency: 'VND',
    category: 'House',
    yieldRate: 4.2,
    description: '100m2, 4 tầng, cho thuê 30tr/tháng',
  },
  
  // Custom Assets
  {
    id: 'custom-1',
    ticker: 'BUSINESS-01',
    name: 'Quán Cafe',
    assetType: 'custom',
    price: 2000000000, // 2 tỷ VND
    currency: 'VND',
    category: 'Business',
    yieldRate: 18.0,
    description: 'Thu nhập ~30tr/tháng',
  },
  {
    id: 'custom-2',
    ticker: 'LAND-01',
    name: 'Đất nông nghiệp Đồng Nai',
    assetType: 'custom',
    price: 1500000000, // 1.5 tỷ VND
    currency: 'VND',
    category: 'Land',
    description: '1000m2, giá tăng bình quân 8%/năm',
  },
];

// Helper function to get asset by ID
export function getAssetById(id: string): OtherAsset | undefined {
  return otherAssets.find(asset => asset.id === id);
}

// Helper function to get assets by type
export function getAssetsByType(type: OtherAsset['assetType']): OtherAsset[] {
  return otherAssets.filter(asset => asset.assetType === type);
}

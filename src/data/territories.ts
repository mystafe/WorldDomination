// RISK-style territory definitions for different maps

export interface Territory {
  id: string
  name: string
  continent: string
  neighbors: string[]
  // Geographic coordinates for rendering
  lat?: number
  lon?: number
}

export interface Continent {
  id: string
  name: string
  bonus: number // Extra armies for controlling the whole continent
  color: string
}

export interface MapDefinition {
  id: string
  name: string
  continents: Continent[]
  territories: Territory[]
}

// WORLD MAP (simplified classic RISK-style)
export const WORLD_MAP: MapDefinition = {
  id: 'world',
  name: 'World',
  continents: [
    { id: 'north_america', name: 'North America', bonus: 5, color: '#F59E0B' },
    { id: 'south_america', name: 'South America', bonus: 2, color: '#EF4444' },
    { id: 'europe', name: 'Europe', bonus: 5, color: '#3B82F6' },
    { id: 'africa', name: 'Africa', bonus: 3, color: '#8B5CF6' },
    { id: 'asia', name: 'Asia', bonus: 7, color: '#10B981' },
    { id: 'australia', name: 'Australia', bonus: 2, color: '#EC4899' }
  ],
  territories: [
    // North America (9 territories)
    { id: 'alaska', name: 'Alaska', continent: 'north_america', neighbors: ['northwest_territory', 'alberta', 'kamchatka'], lat: 64, lon: -153 },
    { id: 'northwest_territory', name: 'Northwest Territory', continent: 'north_america', neighbors: ['alaska', 'alberta', 'ontario', 'greenland'], lat: 62, lon: -110 },
    { id: 'greenland', name: 'Greenland', continent: 'north_america', neighbors: ['northwest_territory', 'ontario', 'quebec', 'iceland'], lat: 72, lon: -40 },
    { id: 'alberta', name: 'Alberta', continent: 'north_america', neighbors: ['alaska', 'northwest_territory', 'ontario', 'western_us'], lat: 54, lon: -115 },
    { id: 'ontario', name: 'Ontario', continent: 'north_america', neighbors: ['northwest_territory', 'alberta', 'greenland', 'quebec', 'western_us', 'eastern_us'], lat: 50, lon: -85 },
    { id: 'quebec', name: 'Quebec', continent: 'north_america', neighbors: ['ontario', 'greenland', 'eastern_us'], lat: 52, lon: -70 },
    { id: 'western_us', name: 'Western United States', continent: 'north_america', neighbors: ['alberta', 'ontario', 'eastern_us', 'central_america'], lat: 40, lon: -110 },
    { id: 'eastern_us', name: 'Eastern United States', continent: 'north_america', neighbors: ['ontario', 'quebec', 'western_us', 'central_america'], lat: 38, lon: -80 },
    { id: 'central_america', name: 'Central America', continent: 'north_america', neighbors: ['western_us', 'eastern_us', 'venezuela'], lat: 15, lon: -90 },
    
    // South America (4 territories)
    { id: 'venezuela', name: 'Venezuela', continent: 'south_america', neighbors: ['central_america', 'peru', 'brazil'], lat: 8, lon: -66 },
    { id: 'peru', name: 'Peru', continent: 'south_america', neighbors: ['venezuela', 'brazil', 'argentina'], lat: -10, lon: -76 },
    { id: 'brazil', name: 'Brazil', continent: 'south_america', neighbors: ['venezuela', 'peru', 'argentina', 'north_africa'], lat: -10, lon: -52 },
    { id: 'argentina', name: 'Argentina', continent: 'south_america', neighbors: ['peru', 'brazil'], lat: -34, lon: -64 },
    
    // Europe (7 territories)
    { id: 'iceland', name: 'Iceland', continent: 'europe', neighbors: ['greenland', 'great_britain', 'scandinavia'], lat: 65, lon: -18 },
    { id: 'great_britain', name: 'Great Britain', continent: 'europe', neighbors: ['iceland', 'scandinavia', 'northern_europe', 'western_europe'], lat: 54, lon: -2 },
    { id: 'scandinavia', name: 'Scandinavia', continent: 'europe', neighbors: ['iceland', 'great_britain', 'northern_europe', 'ukraine'], lat: 62, lon: 15 },
    { id: 'northern_europe', name: 'Northern Europe', continent: 'europe', neighbors: ['great_britain', 'scandinavia', 'ukraine', 'southern_europe', 'western_europe'], lat: 52, lon: 10 },
    { id: 'western_europe', name: 'Western Europe', continent: 'europe', neighbors: ['great_britain', 'northern_europe', 'southern_europe', 'north_africa'], lat: 47, lon: 2 },
    { id: 'southern_europe', name: 'Southern Europe', continent: 'europe', neighbors: ['western_europe', 'northern_europe', 'ukraine', 'north_africa', 'egypt', 'middle_east'], lat: 42, lon: 15 },
    { id: 'ukraine', name: 'Ukraine', continent: 'europe', neighbors: ['scandinavia', 'northern_europe', 'southern_europe', 'middle_east', 'afghanistan', 'ural'], lat: 49, lon: 32 },
    
    // Africa (6 territories)
    { id: 'north_africa', name: 'North Africa', continent: 'africa', neighbors: ['brazil', 'western_europe', 'southern_europe', 'egypt', 'east_africa', 'congo'], lat: 20, lon: 10 },
    { id: 'egypt', name: 'Egypt', continent: 'africa', neighbors: ['north_africa', 'southern_europe', 'middle_east', 'east_africa'], lat: 26, lon: 30 },
    { id: 'east_africa', name: 'East Africa', continent: 'africa', neighbors: ['egypt', 'north_africa', 'congo', 'south_africa', 'madagascar', 'middle_east'], lat: 0, lon: 35 },
    { id: 'congo', name: 'Congo', continent: 'africa', neighbors: ['north_africa', 'east_africa', 'south_africa'], lat: -2, lon: 22 },
    { id: 'south_africa', name: 'South Africa', continent: 'africa', neighbors: ['congo', 'east_africa', 'madagascar'], lat: -28, lon: 25 },
    { id: 'madagascar', name: 'Madagascar', continent: 'africa', neighbors: ['east_africa', 'south_africa'], lat: -19, lon: 47 },
    
    // Asia (12 territories)
    { id: 'ural', name: 'Ural', continent: 'asia', neighbors: ['ukraine', 'afghanistan', 'siberia', 'china'], lat: 60, lon: 60 },
    { id: 'siberia', name: 'Siberia', continent: 'asia', neighbors: ['ural', 'china', 'mongolia', 'irkutsk', 'yakutsk'], lat: 60, lon: 105 },
    { id: 'yakutsk', name: 'Yakutsk', continent: 'asia', neighbors: ['siberia', 'irkutsk', 'kamchatka'], lat: 62, lon: 130 },
    { id: 'kamchatka', name: 'Kamchatka', continent: 'asia', neighbors: ['yakutsk', 'irkutsk', 'mongolia', 'japan', 'alaska'], lat: 56, lon: 160 },
    { id: 'irkutsk', name: 'Irkutsk', continent: 'asia', neighbors: ['siberia', 'yakutsk', 'kamchatka', 'mongolia'], lat: 52, lon: 104 },
    { id: 'mongolia', name: 'Mongolia', continent: 'asia', neighbors: ['siberia', 'irkutsk', 'kamchatka', 'japan', 'china'], lat: 46, lon: 105 },
    { id: 'japan', name: 'Japan', continent: 'asia', neighbors: ['mongolia', 'kamchatka'], lat: 36, lon: 138 },
    { id: 'afghanistan', name: 'Afghanistan', continent: 'asia', neighbors: ['ukraine', 'ural', 'china', 'india', 'middle_east'], lat: 33, lon: 65 },
    { id: 'china', name: 'China', continent: 'asia', neighbors: ['ural', 'siberia', 'mongolia', 'afghanistan', 'india', 'siam'], lat: 35, lon: 105 },
    { id: 'middle_east', name: 'Middle East', continent: 'asia', neighbors: ['ukraine', 'southern_europe', 'egypt', 'east_africa', 'afghanistan', 'india'], lat: 29, lon: 48 },
    { id: 'india', name: 'India', continent: 'asia', neighbors: ['middle_east', 'afghanistan', 'china', 'siam'], lat: 20, lon: 77 },
    { id: 'siam', name: 'Siam', continent: 'asia', neighbors: ['china', 'india', 'indonesia'], lat: 15, lon: 101 },
    
    // Australia (4 territories)
    { id: 'indonesia', name: 'Indonesia', continent: 'australia', neighbors: ['siam', 'new_guinea', 'western_australia'], lat: -2, lon: 118 },
    { id: 'new_guinea', name: 'New Guinea', continent: 'australia', neighbors: ['indonesia', 'eastern_australia', 'western_australia'], lat: -6, lon: 147 },
    { id: 'western_australia', name: 'Western Australia', continent: 'australia', neighbors: ['indonesia', 'new_guinea', 'eastern_australia'], lat: -25, lon: 122 },
    { id: 'eastern_australia', name: 'Eastern Australia', continent: 'australia', neighbors: ['new_guinea', 'western_australia'], lat: -27, lon: 145 }
  ]
}

// TURKEY MAP
export const TURKEY_MAP: MapDefinition = {
  id: 'turkey',
  name: 'Turkey',
  continents: [
    { id: 'marmara', name: 'Marmara', bonus: 3, color: '#3B82F6' },
    { id: 'aegean', name: 'Ege', bonus: 2, color: '#10B981' },
    { id: 'mediterranean', name: 'Akdeniz', bonus: 2, color: '#F59E0B' },
    { id: 'central_anatolia', name: 'İç Anadolu', bonus: 2, color: '#8B5CF6' },
    { id: 'black_sea', name: 'Karadeniz', bonus: 2, color: '#6B7280' },
    { id: 'eastern_anatolia', name: 'Doğu Anadolu', bonus: 2, color: '#EF4444' },
    { id: 'southeastern_anatolia', name: 'Güneydoğu Anadolu', bonus: 2, color: '#EC4899' }
  ],
  territories: [
    // Marmara
    { id: 'istanbul', name: 'İstanbul', continent: 'marmara', neighbors: ['kocaeli', 'tekirdag', 'bursa'], lat: 41.02, lon: 28.97 },
    { id: 'tekirdag', name: 'Tekirdağ', continent: 'marmara', neighbors: ['istanbul', 'kirklareli', 'edirne'], lat: 40.98, lon: 27.51 },
    { id: 'edirne', name: 'Edirne', continent: 'marmara', neighbors: ['tekirdag', 'kirklareli'], lat: 41.67, lon: 26.56 },
    { id: 'kirklareli', name: 'Kırklareli', continent: 'marmara', neighbors: ['edirne', 'tekirdag'], lat: 41.73, lon: 27.22 },
    { id: 'kocaeli', name: 'Kocaeli', continent: 'marmara', neighbors: ['istanbul', 'sakarya', 'bursa', 'yalova'], lat: 40.76, lon: 29.94 },
    { id: 'sakarya', name: 'Sakarya', continent: 'marmara', neighbors: ['kocaeli', 'bilecik', 'bolu', 'duzce'], lat: 40.77, lon: 30.40 },
    { id: 'yalova', name: 'Yalova', continent: 'marmara', neighbors: ['kocaeli', 'bursa'], lat: 40.65, lon: 29.27 },
    { id: 'bursa', name: 'Bursa', continent: 'marmara', neighbors: ['istanbul', 'kocaeli', 'yalova', 'balikesir', 'bilecik'], lat: 40.18, lon: 29.06 },
    { id: 'bilecik', name: 'Bilecik', continent: 'marmara', neighbors: ['bursa', 'sakarya', 'eskisehir', 'kutahya'], lat: 40.05, lon: 30.07 },
    
    // Aegean
    { id: 'canakkale', name: 'Çanakkale', continent: 'aegean', neighbors: ['balikesir', 'bursa'], lat: 40.15, lon: 26.41 },
    { id: 'balikesir', name: 'Balıkesir', continent: 'aegean', neighbors: ['canakkale', 'bursa', 'kutahya', 'manisa', 'izmir'], lat: 39.65, lon: 27.88 },
    { id: 'izmir', name: 'İzmir', continent: 'aegean', neighbors: ['balikesir', 'manisa', 'aydin'], lat: 38.42, lon: 27.14 },
    { id: 'manisa', name: 'Manisa', continent: 'aegean', neighbors: ['balikesir', 'izmir', 'aydin', 'usak'], lat: 38.61, lon: 27.43 },
    { id: 'aydin', name: 'Aydın', continent: 'aegean', neighbors: ['izmir', 'manisa', 'denizli', 'mugla'], lat: 37.85, lon: 27.84 },
    { id: 'mugla', name: 'Muğla', continent: 'aegean', neighbors: ['aydin', 'denizli', 'burdur', 'antalya'], lat: 37.21, lon: 28.36 },
    { id: 'denizli', name: 'Denizli', continent: 'aegean', neighbors: ['aydin', 'mugla', 'burdur', 'afyon', 'usak'], lat: 37.77, lon: 29.08 },
    { id: 'usak', name: 'Uşak', continent: 'aegean', neighbors: ['manisa', 'denizli', 'afyon', 'kutahya'], lat: 38.68, lon: 29.40 },
    
    // Mediterranean
    { id: 'antalya', name: 'Antalya', continent: 'mediterranean', neighbors: ['mugla', 'burdur', 'isparta', 'konya', 'mersin'], lat: 36.90, lon: 30.71 },
    { id: 'mersin', name: 'Mersin', continent: 'mediterranean', neighbors: ['antalya', 'konya', 'nigde', 'adana', 'karaman'], lat: 36.81, lon: 34.64 },
    { id: 'adana', name: 'Adana', continent: 'mediterranean', neighbors: ['mersin', 'nigde', 'kayseri', 'kahramanmaras', 'osmaniye', 'hatay'], lat: 37.00, lon: 35.32 },
    { id: 'hatay', name: 'Hatay', continent: 'mediterranean', neighbors: ['adana', 'osmaniye'], lat: 36.20, lon: 36.16 },
    { id: 'osmaniye', name: 'Osmaniye', continent: 'mediterranean', neighbors: ['adana', 'hatay', 'kahramanmaras', 'gaziantep'], lat: 37.07, lon: 36.25 },
    
    // Central Anatolia
    { id: 'ankara', name: 'Ankara', continent: 'central_anatolia', neighbors: ['bolu', 'cankiri', 'kirikkale', 'kirsehir', 'aksaray', 'konya', 'eskisehir'], lat: 39.93, lon: 32.85 },
    { id: 'konya', name: 'Konya', continent: 'central_anatolia', neighbors: ['ankara', 'aksaray', 'karaman', 'mersin', 'antalya', 'isparta', 'afyon', 'eskisehir'], lat: 37.87, lon: 32.48 },
    { id: 'eskisehir', name: 'Eskişehir', continent: 'central_anatolia', neighbors: ['bilecik', 'kutahya', 'afyon', 'konya', 'ankara', 'bolu'], lat: 39.77, lon: 30.52 },
    { id: 'afyon', name: 'Afyon', continent: 'central_anatolia', neighbors: ['kutahya', 'usak', 'denizli', 'burdur', 'isparta', 'konya', 'eskisehir'], lat: 38.76, lon: 30.54 },
    { id: 'kutahya', name: 'Kütahya', continent: 'central_anatolia', neighbors: ['bilecik', 'bursa', 'balikesir', 'usak', 'afyon', 'eskisehir'], lat: 39.42, lon: 29.98 },
    { id: 'burdur', name: 'Burdur', continent: 'central_anatolia', neighbors: ['denizli', 'mugla', 'antalya', 'isparta', 'afyon'], lat: 37.72, lon: 30.29 },
    { id: 'isparta', name: 'Isparta', continent: 'central_anatolia', neighbors: ['burdur', 'antalya', 'konya', 'afyon'], lat: 37.76, lon: 30.55 },
    { id: 'karaman', name: 'Karaman', continent: 'central_anatolia', neighbors: ['konya', 'mersin', 'nigde', 'aksaray'], lat: 37.18, lon: 33.21 },
    { id: 'aksaray', name: 'Aksaray', continent: 'central_anatolia', neighbors: ['ankara', 'kirsehir', 'nevsehir', 'nigde', 'karaman', 'konya'], lat: 38.37, lon: 34.03 },
    { id: 'nigde', name: 'Niğde', continent: 'central_anatolia', neighbors: ['aksaray', 'nevsehir', 'kayseri', 'adana', 'mersin', 'karaman'], lat: 37.97, lon: 34.69 },
    { id: 'kirsehir', name: 'Kırşehir', continent: 'central_anatolia', neighbors: ['ankara', 'kirikkale', 'yozgat', 'nevsehir', 'aksaray'], lat: 39.14, lon: 34.17 },
    { id: 'nevsehir', name: 'Nevşehir', continent: 'central_anatolia', neighbors: ['kirsehir', 'yozgat', 'kayseri', 'nigde', 'aksaray'], lat: 38.62, lon: 34.72 },
    { id: 'kayseri', name: 'Kayseri', continent: 'central_anatolia', neighbors: ['nevsehir', 'yozgat', 'sivas', 'kahramanmaras', 'adana', 'nigde'], lat: 38.73, lon: 35.48 },
    
    // Black Sea
    { id: 'duzce', name: 'Düzce', continent: 'black_sea', neighbors: ['sakarya', 'bolu', 'zonguldak'], lat: 40.84, lon: 31.16 },
    { id: 'bolu', name: 'Bolu', continent: 'black_sea', neighbors: ['duzce', 'sakarya', 'ankara', 'cankiri', 'karabuk', 'zonguldak'], lat: 40.74, lon: 31.61 },
    { id: 'zonguldak', name: 'Zonguldak', continent: 'black_sea', neighbors: ['duzce', 'bolu', 'karabuk', 'bartin'], lat: 41.45, lon: 31.79 },
    { id: 'karabuk', name: 'Karabük', continent: 'black_sea', neighbors: ['zonguldak', 'bolu', 'cankiri', 'kastamonu', 'bartin'], lat: 41.20, lon: 32.62 },
    { id: 'bartin', name: 'Bartın', continent: 'black_sea', neighbors: ['zonguldak', 'karabuk', 'kastamonu'], lat: 41.63, lon: 32.33 },
    { id: 'kastamonu', name: 'Kastamonu', continent: 'black_sea', neighbors: ['bartin', 'karabuk', 'cankiri', 'corum', 'sinop'], lat: 41.38, lon: 33.78 },
    { id: 'cankiri', name: 'Çankırı', continent: 'black_sea', neighbors: ['bolu', 'ankara', 'kirikkale', 'corum', 'kastamonu', 'karabuk'], lat: 40.60, lon: 33.61 },
    { id: 'sinop', name: 'Sinop', continent: 'black_sea', neighbors: ['kastamonu', 'corum', 'samsun'], lat: 42.03, lon: 35.15 },
    { id: 'corum', name: 'Çorum', continent: 'black_sea', neighbors: ['kastamonu', 'cankiri', 'kirikkale', 'yozgat', 'amasya', 'samsun', 'sinop'], lat: 40.55, lon: 34.95 },
    { id: 'samsun', name: 'Samsun', continent: 'black_sea', neighbors: ['sinop', 'corum', 'amasya', 'tokat', 'ordu'], lat: 41.29, lon: 36.33 },
    { id: 'amasya', name: 'Amasya', continent: 'black_sea', neighbors: ['corum', 'yozgat', 'sivas', 'tokat', 'samsun'], lat: 40.65, lon: 35.83 },
    { id: 'tokat', name: 'Tokat', continent: 'black_sea', neighbors: ['amasya', 'sivas', 'ordu', 'samsun'], lat: 40.31, lon: 36.55 },
    { id: 'ordu', name: 'Ordu', continent: 'black_sea', neighbors: ['samsun', 'tokat', 'sivas', 'giresun'], lat: 40.98, lon: 37.88 },
    { id: 'giresun', name: 'Giresun', continent: 'black_sea', neighbors: ['ordu', 'sivas', 'gumushane', 'trabzon'], lat: 40.91, lon: 38.39 },
    { id: 'trabzon', name: 'Trabzon', continent: 'black_sea', neighbors: ['giresun', 'gumushane', 'bayburt', 'rize'], lat: 41.00, lon: 39.72 },
    { id: 'rize', name: 'Rize', continent: 'black_sea', neighbors: ['trabzon', 'bayburt', 'erzurum', 'artvin'], lat: 41.02, lon: 40.52 },
    { id: 'artvin', name: 'Artvin', continent: 'black_sea', neighbors: ['rize', 'erzurum', 'ardahan'], lat: 41.18, lon: 41.82 },
    
    // Eastern Anatolia
    { id: 'erzurum', name: 'Erzurum', continent: 'eastern_anatolia', neighbors: ['rize', 'bayburt', 'erzincan', 'agri', 'kars', 'artvin'], lat: 39.90, lon: 41.27 },
    { id: 'kars', name: 'Kars', continent: 'eastern_anatolia', neighbors: ['erzurum', 'agri', 'igdir', 'ardahan'], lat: 40.59, lon: 43.10 },
    { id: 'ardahan', name: 'Ardahan', continent: 'eastern_anatolia', neighbors: ['artvin', 'kars'], lat: 41.11, lon: 42.70 },
    { id: 'agri', name: 'Ağrı', continent: 'eastern_anatolia', neighbors: ['erzurum', 'kars', 'igdir', 'van', 'mus', 'bingol', 'erzincan'], lat: 39.72, lon: 43.05 },
    { id: 'igdir', name: 'Iğdır', continent: 'eastern_anatolia', neighbors: ['kars', 'agri'], lat: 39.92, lon: 44.05 },
    { id: 'van', name: 'Van', continent: 'eastern_anatolia', neighbors: ['agri', 'mus', 'bitlis', 'hakkari'], lat: 38.49, lon: 43.38 },
    { id: 'hakkari', name: 'Hakkari', continent: 'eastern_anatolia', neighbors: ['van', 'sirnak'], lat: 37.57, lon: 43.74 },
    { id: 'mus', name: 'Muş', continent: 'eastern_anatolia', neighbors: ['agri', 'bingol', 'bitlis', 'van'], lat: 38.74, lon: 41.50 },
    { id: 'bitlis', name: 'Bitlis', continent: 'eastern_anatolia', neighbors: ['mus', 'van', 'siirt', 'batman'], lat: 38.40, lon: 42.11 },
    { id: 'bingol', name: 'Bingöl', continent: 'eastern_anatolia', neighbors: ['agri', 'mus', 'tunceli', 'elazig', 'erzincan'], lat: 38.88, lon: 40.49 },
    { id: 'tunceli', name: 'Tunceli', continent: 'eastern_anatolia', neighbors: ['bingol', 'elazig', 'diyarbakir', 'erzincan'], lat: 39.10, lon: 39.54 },
    { id: 'elazig', name: 'Elazığ', continent: 'eastern_anatolia', neighbors: ['bingol', 'tunceli', 'diyarbakir', 'malatya', 'erzincan'], lat: 38.68, lon: 39.22 },
    { id: 'malatya', name: 'Malatya', continent: 'eastern_anatolia', neighbors: ['elazig', 'diyarbakir', 'adiyaman', 'kahramanmaras', 'sivas', 'erzincan'], lat: 38.35, lon: 38.31 },
    { id: 'erzincan', name: 'Erzincan', continent: 'eastern_anatolia', neighbors: ['erzurum', 'bayburt', 'gumushane', 'sivas', 'malatya', 'elazig', 'tunceli', 'bingol', 'agri'], lat: 39.75, lon: 39.49 },
    { id: 'bayburt', name: 'Bayburt', continent: 'eastern_anatolia', neighbors: ['trabzon', 'gumushane', 'erzincan', 'erzurum'], lat: 40.26, lon: 40.23 },
    { id: 'gumushane', name: 'Gümüşhane', continent: 'eastern_anatolia', neighbors: ['giresun', 'trabzon', 'bayburt', 'erzincan', 'sivas'], lat: 40.46, lon: 39.48 },
    
    // Southeastern Anatolia
    { id: 'gaziantep', name: 'Gaziantep', continent: 'southeastern_anatolia', neighbors: ['osmaniye', 'kahramanmaras', 'adiyaman', 'kilis', 'sanliurfa'], lat: 37.06, lon: 37.38 },
    { id: 'kilis', name: 'Kilis', continent: 'southeastern_anatolia', neighbors: ['gaziantep'], lat: 36.72, lon: 37.12 },
    { id: 'kahramanmaras', name: 'Kahramanmaraş', continent: 'southeastern_anatolia', neighbors: ['osmaniye', 'adana', 'kayseri', 'sivas', 'malatya', 'adiyaman', 'gaziantep'], lat: 37.58, lon: 36.92 },
    { id: 'adiyaman', name: 'Adıyaman', continent: 'southeastern_anatolia', neighbors: ['kahramanmaras', 'malatya', 'diyarbakir', 'sanliurfa', 'gaziantep'], lat: 37.76, lon: 38.28 },
    { id: 'sanliurfa', name: 'Şanlıurfa', continent: 'southeastern_anatolia', neighbors: ['gaziantep', 'adiyaman', 'diyarbakir', 'mardin'], lat: 37.16, lon: 38.79 },
    { id: 'diyarbakir', name: 'Diyarbakır', continent: 'southeastern_anatolia', neighbors: ['adiyaman', 'malatya', 'elazig', 'tunceli', 'bingol', 'mus', 'bitlis', 'batman', 'siirt', 'mardin', 'sanliurfa'], lat: 37.91, lon: 40.23 },
    { id: 'mardin', name: 'Mardin', continent: 'southeastern_anatolia', neighbors: ['sanliurfa', 'diyarbakir', 'batman', 'siirt', 'sirnak'], lat: 37.31, lon: 40.73 },
    { id: 'batman', name: 'Batman', continent: 'southeastern_anatolia', neighbors: ['diyarbakir', 'bitlis', 'siirt', 'mardin'], lat: 37.88, lon: 41.13 },
    { id: 'siirt', name: 'Siirt', continent: 'southeastern_anatolia', neighbors: ['diyarbakir', 'batman', 'bitlis', 'van', 'hakkari', 'sirnak', 'mardin'], lat: 37.93, lon: 41.94 },
    { id: 'sirnak', name: 'Şırnak', continent: 'southeastern_anatolia', neighbors: ['mardin', 'siirt', 'hakkari'], lat: 37.52, lon: 42.45 },
    
    // Additional Central Anatolia
    { id: 'kirikkale', name: 'Kırıkkale', continent: 'central_anatolia', neighbors: ['ankara', 'cankiri', 'corum', 'yozgat', 'kirsehir'], lat: 39.84, lon: 33.51 },
    { id: 'yozgat', name: 'Yozgat', continent: 'central_anatolia', neighbors: ['kirikkale', 'corum', 'amasya', 'sivas', 'kayseri', 'nevsehir', 'kirsehir'], lat: 39.82, lon: 34.81 },
    { id: 'sivas', name: 'Sivas', continent: 'central_anatolia', neighbors: ['yozgat', 'amasya', 'tokat', 'ordu', 'giresun', 'gumushane', 'erzincan', 'malatya', 'kahramanmaras', 'kayseri'], lat: 39.75, lon: 37.02 }
  ]
}

// EUROPE MAP
export const EUROPE_MAP: MapDefinition = {
  id: 'europe',
  name: 'Europe',
  continents: [
    { id: 'western_europe', name: 'Western Europe', bonus: 4, color: '#3B82F6' },
    { id: 'southern_europe', name: 'Southern Europe', bonus: 3, color: '#F59E0B' },
    { id: 'northern_europe', name: 'Northern Europe', bonus: 3, color: '#10B981' },
    { id: 'eastern_europe', name: 'Eastern Europe', bonus: 4, color: '#8B5CF6' },
    { id: 'balkans', name: 'Balkans', bonus: 2, color: '#EF4444' }
  ],
  territories: [
    // Western Europe
    { id: 'portugal', name: 'Portugal', continent: 'western_europe', neighbors: ['spain'], lat: 39.4, lon: -8.2 },
    { id: 'spain', name: 'Spain', continent: 'western_europe', neighbors: ['portugal', 'france'], lat: 40.5, lon: -3.7 },
    { id: 'france', name: 'France', continent: 'western_europe', neighbors: ['spain', 'belgium', 'germany', 'switzerland', 'italy'], lat: 46.2, lon: 2.2 },
    { id: 'belgium', name: 'Belgium', continent: 'western_europe', neighbors: ['france', 'netherlands', 'germany'], lat: 50.5, lon: 4.5 },
    { id: 'netherlands', name: 'Netherlands', continent: 'western_europe', neighbors: ['belgium', 'germany'], lat: 52.1, lon: 5.3 },
    { id: 'switzerland', name: 'Switzerland', continent: 'western_europe', neighbors: ['france', 'germany', 'austria', 'italy'], lat: 46.8, lon: 8.2 },
    { id: 'austria', name: 'Austria', continent: 'western_europe', neighbors: ['germany', 'switzerland', 'italy', 'slovenia', 'hungary', 'czech_republic'], lat: 47.5, lon: 14.6 },
    { id: 'germany', name: 'Germany', continent: 'western_europe', neighbors: ['netherlands', 'belgium', 'france', 'switzerland', 'austria', 'czech_republic', 'poland', 'denmark'], lat: 51.2, lon: 10.5 },
    
    // Southern Europe
    { id: 'italy', name: 'Italy', continent: 'southern_europe', neighbors: ['france', 'switzerland', 'austria', 'slovenia'], lat: 41.9, lon: 12.6 },
    { id: 'greece', name: 'Greece', continent: 'southern_europe', neighbors: ['albania', 'north_macedonia', 'bulgaria', 'turkey'], lat: 39.1, lon: 21.8 },
    { id: 'turkey', name: 'Turkey', continent: 'southern_europe', neighbors: ['greece', 'bulgaria'], lat: 39.0, lon: 35.0 },
    
    // Northern Europe
    { id: 'uk', name: 'United Kingdom', continent: 'northern_europe', neighbors: ['ireland', 'iceland'], lat: 55.4, lon: -3.4 },
    { id: 'ireland', name: 'Ireland', continent: 'northern_europe', neighbors: ['uk'], lat: 53.4, lon: -8.2 },
    { id: 'iceland', name: 'Iceland', continent: 'northern_europe', neighbors: ['uk', 'norway'], lat: 60.0, lon: -10.0 },
    { id: 'norway', name: 'Norway', continent: 'northern_europe', neighbors: ['iceland', 'sweden', 'finland'], lat: 60.5, lon: 8.5 },
    { id: 'sweden', name: 'Sweden', continent: 'northern_europe', neighbors: ['norway', 'finland', 'denmark'], lat: 60.1, lon: 18.6 },
    { id: 'denmark', name: 'Denmark', continent: 'northern_europe', neighbors: ['sweden', 'germany'], lat: 56.3, lon: 9.5 },
    { id: 'finland', name: 'Finland', continent: 'northern_europe', neighbors: ['norway', 'sweden', 'russia'], lat: 61.9, lon: 25.7 },
    
    // Eastern Europe
    { id: 'poland', name: 'Poland', continent: 'eastern_europe', neighbors: ['germany', 'czech_republic', 'slovakia', 'ukraine', 'belarus', 'lithuania'], lat: 51.9, lon: 19.1 },
    { id: 'czech_republic', name: 'Czech Republic', continent: 'eastern_europe', neighbors: ['germany', 'austria', 'slovakia', 'poland'], lat: 49.8, lon: 15.5 },
    { id: 'slovakia', name: 'Slovakia', continent: 'eastern_europe', neighbors: ['czech_republic', 'austria', 'hungary', 'ukraine', 'poland'], lat: 48.7, lon: 19.7 },
    { id: 'hungary', name: 'Hungary', continent: 'eastern_europe', neighbors: ['austria', 'slovakia', 'ukraine', 'romania', 'serbia', 'croatia', 'slovenia'], lat: 47.2, lon: 19.5 },
    { id: 'romania', name: 'Romania', continent: 'eastern_europe', neighbors: ['hungary', 'ukraine', 'moldova', 'bulgaria', 'serbia'], lat: 45.9, lon: 24.9 },
    { id: 'ukraine', name: 'Ukraine', continent: 'eastern_europe', neighbors: ['poland', 'slovakia', 'hungary', 'romania', 'moldova', 'russia', 'belarus'], lat: 48.4, lon: 31.2 },
    { id: 'belarus', name: 'Belarus', continent: 'eastern_europe', neighbors: ['poland', 'ukraine', 'russia', 'latvia', 'lithuania'], lat: 53.7, lon: 27.9 },
    { id: 'moldova', name: 'Moldova', continent: 'eastern_europe', neighbors: ['romania', 'ukraine'], lat: 47.4, lon: 28.4 },
    { id: 'russia', name: 'Russia', continent: 'eastern_europe', neighbors: ['finland', 'belarus', 'ukraine', 'latvia', 'estonia'], lat: 61.5, lon: 35.2433 },
    { id: 'estonia', name: 'Estonia', continent: 'eastern_europe', neighbors: ['russia', 'latvia'], lat: 58.6, lon: 25.0 },
    { id: 'latvia', name: 'Latvia', continent: 'eastern_europe', neighbors: ['estonia', 'russia', 'belarus', 'lithuania'], lat: 56.9, lon: 24.6 },
    { id: 'lithuania', name: 'Lithuania', continent: 'eastern_europe', neighbors: ['latvia', 'belarus', 'poland'], lat: 55.2, lon: 23.9 },
    
    // Balkans
    { id: 'slovenia', name: 'Slovenia', continent: 'balkans', neighbors: ['austria', 'italy', 'hungary', 'croatia'], lat: 46.2, lon: 14.9 },
    { id: 'croatia', name: 'Croatia', continent: 'balkans', neighbors: ['slovenia', 'hungary', 'serbia', 'bosnia', 'montenegro'], lat: 45.1, lon: 15.2 },
    { id: 'bosnia', name: 'Bosnia and Herzegovina', continent: 'balkans', neighbors: ['croatia', 'serbia', 'montenegro'], lat: 43.9, lon: 17.7 },
    { id: 'serbia', name: 'Serbia', continent: 'balkans', neighbors: ['hungary', 'romania', 'bulgaria', 'north_macedonia', 'kosovo', 'montenegro', 'bosnia', 'croatia'], lat: 44.0, lon: 21.0 },
    { id: 'montenegro', name: 'Montenegro', continent: 'balkans', neighbors: ['croatia', 'bosnia', 'serbia', 'kosovo', 'albania'], lat: 42.7, lon: 19.4 },
    { id: 'kosovo', name: 'Kosovo', continent: 'balkans', neighbors: ['serbia', 'montenegro', 'albania', 'north_macedonia'], lat: 42.6, lon: 20.9 },
    { id: 'albania', name: 'Albania', continent: 'balkans', neighbors: ['montenegro', 'kosovo', 'north_macedonia', 'greece'], lat: 41.2, lon: 20.2 },
    { id: 'north_macedonia', name: 'North Macedonia', continent: 'balkans', neighbors: ['serbia', 'kosovo', 'albania', 'greece', 'bulgaria'], lat: 41.6, lon: 21.7 },
    { id: 'bulgaria', name: 'Bulgaria', continent: 'balkans', neighbors: ['romania', 'serbia', 'north_macedonia', 'greece', 'turkey'], lat: 42.7, lon: 25.5 }
  ]
}

export const ALL_MAPS: MapDefinition[] = [WORLD_MAP, TURKEY_MAP, EUROPE_MAP]

export function getMapById(id: string): MapDefinition | undefined {
  return ALL_MAPS.find(m => m.id === id)
}

export function getTerritoryById(mapId: string, territoryId: string): Territory | undefined {
  const map = getMapById(mapId)
  return map?.territories.find(t => t.id === territoryId)
}

export function getContinentById(mapId: string, continentId: string): Continent | undefined {
  const map = getMapById(mapId)
  return map?.continents.find(c => c.id === continentId)
}


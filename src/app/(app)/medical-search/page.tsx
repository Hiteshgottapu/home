
"use client";

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Search, ExternalLink, ShoppingCart, AlertTriangle, DollarSign, Pill, Store, SearchX } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ScrapedMedicineResult } from '@/types';
import { searchPharmaciesAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function MedicalSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<ScrapedMedicineResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setError("Please enter a medicine name to search.");
      setSearched(true); 
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    try {
      const actionResult = await searchPharmaciesAction(searchTerm);
      if (actionResult.error) {
        setError(actionResult.error);
        setResults([]);
      } else {
        setResults(actionResult.data || []);
      }
    } catch (err) {
      console.error("Medical search error:", err);
      setError("An unexpected error occurred. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-2 px-0 md:px-4 space-y-8">
      <Card className="shadow-2xl border-border bg-card">
        <CardHeader className="text-center p-6 border-b border-border">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <Pill className="h-10 w-10 text-primary animate-pulse" />
            <CardTitle className="text-4xl font-extrabold tracking-tight text-primary">Medicine Price Finder</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground max-w-xl mx-auto">
            Compare medicine prices from various online pharmacies. Results are live-scraped and may vary.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <Alert variant="default" className="bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="font-semibold">Important Notice</AlertTitle>
            <AlertDescription className="text-xs">
              This feature attempts to scrape live data from pharmacy websites. Prices, availability, and product links are subject to real-time changes and accuracy is not guaranteed. This tool is for informational purposes only and does not endorse any specific pharmacy or medication. Listings may be incomplete or change without notice. Always verify details directly with the pharmacy. Class selectors for scraping may become outdated, leading to missing or incorrect data.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter medicine name (e.g., Paracetamol, Atorvastatin)"
              className="flex-grow text-base py-3.5 px-4 rounded-md focus:ring-2 focus:ring-primary/80 h-12"
              disabled={isLoading}
              aria-label="Medicine search input"
            />
            <Button type="submit" className="w-full sm:w-auto text-base py-3.5 px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Search Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <div className="text-center py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
              <p className="text-lg font-medium text-muted-foreground">Searching for "<span className="text-primary">{searchTerm}</span>" across pharmacies...</p>
              <p className="text-sm text-muted-foreground">This may take a moment as we fetch live data.</p>
            </div>
          )}

          {!isLoading && searched && results.length === 0 && !error && (
            <div className="text-center py-16 px-6 border-2 border-dashed border-border rounded-lg bg-card flex flex-col items-center justify-center">
              <SearchX size={64} className="mx-auto mb-6 text-muted-foreground opacity-60" data-ai-hint="magnifying glass document" />
              <h3 className="text-2xl font-semibold text-foreground mb-3">No Results for "{searchTerm}"</h3>
              <p className="text-base text-muted-foreground max-w-md mx-auto">
                {searchTerm.trim() === '' ? "Please type a medicine name into the search bar above to find prices." : "We couldn't find any listings for this medicine. Try checking the spelling, using a more generic name, or the medicine might not be available on the searched platforms (or selectors might be outdated)."}
              </p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <ScrollArea className="h-[60vh] max-h-[700px] pr-3 -mr-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {results.map((result, index) => {
                  const priceDisplay = result.price.replace(/[^0-9.,]/g, '').trim() || "N/A";
                  const canVisitPharmacy = result.addToCartLink && result.addToCartLink !== "#" && !result.addToCartLink.includes('search?') && !result.addToCartLink.includes(encodeURIComponent(searchTerm));


                  return (
                    <Card key={index} className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out flex flex-col group transform hover:-translate-y-1 active:shadow-md active:translate-y-0 border border-border hover:border-primary/30">
                      <CardHeader className="pb-2 pt-4">
                        {result.imageUrl && (
                            <div className="relative aspect-[3/2] w-full mb-3 rounded-md overflow-hidden border bg-muted/30 group-hover:border-primary/20">
                                <Image 
                                    src={result.imageUrl} 
                                    alt={`Image of ${result.drugName}`} 
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                                    data-ai-hint={result.drugName ? result.drugName.split(' ').slice(0,2).join(' ') : "medicine product"}
                                />
                            </div>
                        )}
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate" title={result.drugName}>
                          {result.drugName}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Store size={14}/>Platform: <span className="font-medium">{result.pharmacyName}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2.5 flex-grow pt-1 pb-3">
                        <div className="flex items-baseline gap-2">
                           <p className="text-3xl font-bold text-primary flex items-center">
                            <DollarSign className="h-6 w-6 mr-0.5" />
                            {priceDisplay}
                          </p>
                        </div>
                      </CardContent>
                      <CardFooter className="mt-auto pt-3 pb-4">
                        <Button 
                            asChild 
                            variant={!canVisitPharmacy ? "outline" : "default"} 
                            className={cn("w-full text-sm py-3 transition-all duration-200 active:scale-95", (!canVisitPharmacy) && "border-muted-foreground/50 text-muted-foreground hover:bg-muted/20 dark:hover:bg-muted/40")}
                            disabled={!canVisitPharmacy}
                        >
                          <a href={canVisitPharmacy ? result.addToCartLink : undefined} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            {canVisitPharmacy ? 'Go to Pharmacy' : 'Link N/A'}
                            {canVisitPharmacy && <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-70" />}
                          </a>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

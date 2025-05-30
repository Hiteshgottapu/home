
"use client";

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Search, ExternalLink, ShoppingCart, AlertTriangle, DollarSign, Pill, PackageCheck, PackageX, Store } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ScrapedMedicineResult } from '@/types';
import { searchPharmaciesAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

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
      setSearched(true); // Show "no input" message if trying to submit empty
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

  const getAvailabilityInfo = (availability?: string) => {
    if (!availability) return { text: 'Info N/A', color: 'text-muted-foreground', Icon: PackageX };
    const lowerAvailability = availability.toLowerCase();
    if (lowerAvailability.includes('in stock')) return { text: availability, color: 'text-green-600', Icon: PackageCheck };
    if (lowerAvailability.includes('low stock')) return { text: availability, color: 'text-amber-600', Icon: PackageCheck };
    if (lowerAvailability.includes('out of stock')) return { text: availability, color: 'text-red-600', Icon: PackageX };
    return { text: availability, color: 'text-muted-foreground', Icon: PackageX }; // Default for "Check Availability" etc.
  };

  return (
    <div className="container mx-auto py-2 px-0 md:px-4 space-y-8">
      <Card className="shadow-xl border-border">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Pill className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold text-primary">Medicine Price Finder</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            Compare medicine prices from various online pharmacies.
          </CardDescription>
          <Alert variant="default" className="mt-4 text-left bg-amber-50 border-amber-300 text-amber-700">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="font-semibold">Disclaimer & Beta Notice</AlertTitle>
            <AlertDescription className="text-xs">
              This feature is for informational purposes only and uses **mock data** for demonstration. Prices and availability are illustrative.
              Always verify details directly with the pharmacy. This tool does not endorse any specific pharmacy or medication.
              Actual web scraping is not implemented in this prototype.
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 mb-8">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter medicine name (e.g., Paracetamol, Atorvastatin)"
              className="flex-grow text-base py-3 px-4 rounded-md focus:ring-2 focus:ring-primary/80"
              disabled={isLoading}
              aria-label="Medicine search input"
            />
            <Button type="submit" className="w-full sm:w-auto text-base py-3 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
              {isLoading ? 'Searching...' : 'Search Pharmacies'}
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
            <div className="text-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Searching for "{searchTerm}"...</p>
            </div>
          )}

          {!isLoading && searched && results.length === 0 && !error && (
            <div className="text-center py-12 border border-dashed rounded-lg bg-card">
              <Image data-ai-hint="empty box magnifying glass" src="https://placehold.co/150x150.png?text=No+Results" alt="No results found" width={150} height={150} className="mx-auto mb-4 opacity-70 rounded-full"/>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Results Found for "{searchTerm}"</h3>
              <p className="text-muted-foreground">
                {searchTerm.trim() === '' ? "Please enter a medicine name to start your search." : "Try checking the spelling or searching for a different medicine."}
              </p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <ScrollArea className="h-[calc(100vh-22rem)] sm:h-[550px] pr-3"> {/* Adjusted height slightly */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {results.map((result, index) => {
                  const availabilityInfo = getAvailabilityInfo(result.availability);
                  const isOutOfStock = result.availability?.toLowerCase().includes('out of stock');
                  return (
                    <Card key={index} className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out flex flex-col group transform hover:-translate-y-1 active:shadow-md active:translate-y-0">
                      <CardHeader className="pb-2 pt-4">
                        {result.imageUrl && (
                            <div className="relative aspect-[3/2] w-full mb-3 rounded-md overflow-hidden border bg-muted/30">
                                <Image 
                                    src={result.imageUrl} 
                                    alt={`Image of ${result.drugName}`} 
                                    fill // Use fill for responsive images within a sized container
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Example sizes, adjust as needed
                                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                                    data-ai-hint="medicine product"
                                />
                            </div>
                        )}
                        <CardTitle className="text-lg font-semibold text-foreground hover:text-primary transition-colors truncate" title={result.drugName}>
                          {result.drugName}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground flex items-center gap-1">
                          <Store size={14}/>From: <span className="font-medium">{result.pharmacyName}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2.5 flex-grow pt-1 pb-3">
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-primary flex items-center">
                            <DollarSign className="h-6 w-6 mr-0.5" />
                            {result.price}
                          </p>
                          {result.originalPrice && (
                            <p className="text-sm text-muted-foreground line-through">
                              {result.originalPrice}
                            </p>
                          )}
                        </div>
                        {result.discount && (
                          <Badge variant="destructive" className="text-xs font-semibold">
                            {result.discount}
                          </Badge>
                        )}
                        {result.availability && (
                          <p className={`text-sm font-medium flex items-center gap-1.5 ${availabilityInfo.color}`}>
                            <availabilityInfo.Icon size={16} /> {availabilityInfo.text}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="mt-auto pt-3 pb-4">
                        <Button 
                            asChild 
                            variant={isOutOfStock ? "outline" : "default"} 
                            className={cn("w-full text-sm py-2.5 transition-all duration-200 active:scale-95", isOutOfStock && "border-muted-foreground/50 text-muted-foreground hover:bg-muted/20")}
                            disabled={isOutOfStock || !result.addToCartLink || result.addToCartLink === '#'}
                        >
                          <a href={result.addToCartLink && result.addToCartLink !== '#' && !isOutOfStock ? result.addToCartLink : undefined} target="_blank" rel="noopener noreferrer">
                            {isOutOfStock ? <PackageX className="mr-2 h-4 w-4"/> : <ShoppingCart className="mr-2 h-4 w-4" />}
                            {isOutOfStock ? 'Out of Stock' : (result.addToCartLink && result.addToCartLink !== '#' ? 'Go to Pharmacy' : 'Link Not Available')}
                            {!isOutOfStock && result.addToCartLink && result.addToCartLink !== '#' && <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-70" />}
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


"use client";

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Search, ExternalLink, ShoppingCart, AlertTriangle, DollarSign, Pill } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ScrapedMedicineResult } from '@/types';
import { searchPharmaciesAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';

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
      <Card className="shadow-xl border-border">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Pill className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold text-primary">Medicine Price Finder</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            Search for medicine prices across various online pharmacies.
          </CardDescription>
          <Alert variant="default" className="mt-4 text-left bg-amber-50 border-amber-300 text-amber-700">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="font-semibold">Disclaimer & Beta Notice</AlertTitle>
            <AlertDescription className="text-xs">
              This feature is for informational purposes only and is currently in a beta (mock data) phase. Prices and availability are illustrative.
              Always verify details directly with the pharmacy. This tool does not endorse any specific pharmacy or medication.
              The actual web scraping functionality is a complex feature and is not implemented in this prototype.
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
              <h3 className="text-xl font-semibold text-foreground mb-2">No Results Found</h3>
              <p className="text-muted-foreground">
                We couldn't find "{searchTerm}" at the moment. Try checking the spelling or searching for a different medicine.
              </p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <ScrollArea className="h-[calc(100vh-20rem)] sm:h-[500px] pr-3"> {/* Adjusted height */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((result, index) => (
                  <Card key={index} className="shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-primary truncate flex items-center gap-2" title={result.drugName}>
                        <Pill size={20}/> {result.drugName}
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        From: <span className="font-semibold">{result.pharmacyName}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 flex-grow">
                      <p className="text-2xl font-bold text-foreground flex items-center">
                        <DollarSign className="h-6 w-6 text-green-600 mr-1" />
                        {result.price}
                      </p>
                      {result.originalPrice && (
                        <p className="text-sm text-muted-foreground line-through">
                          Was: {result.originalPrice}
                        </p>
                      )}
                       {result.discount && (
                        <p className="text-xs text-green-600 font-semibold bg-green-100 px-2 py-0.5 rounded-full inline-block">
                          {result.discount}
                        </p>
                      )}
                      {result.availability && (
                        <p className={`text-sm font-medium ${result.availability.toLowerCase().includes('in stock') ? 'text-green-600' : 'text-red-600'}`}>
                          {result.availability}
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="mt-auto pt-4">
                      <Button asChild variant="outline" className="w-full hover:bg-primary/10 hover:border-primary hover:text-primary transition-all duration-200">
                        <a href={result.addToCartLink || '#'} target="_blank" rel="noopener noreferrer" className={!result.addToCartLink ? "pointer-events-none opacity-50" : ""}>
                          {result.addToCartLink ? (
                             <>Go to Pharmacy <ExternalLink className="ml-2 h-4 w-4" /></>
                          ) : (
                            "Link N/A"
                          )}
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

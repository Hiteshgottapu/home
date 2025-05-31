
"use client";

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Pill, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ScrapedMedicineResult } from '@/types';
import { searchPharmaciesAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function MedicalSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<ScrapedMedicineResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedTermDisplay, setSearchedTermDisplay] = useState<string>('');


  const handleSearch = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      setError('Please enter a medicine name to search.');
      setResults([]);
      setSearchedTermDisplay('');
      return;
    }
    
    const currentSearch = searchTerm.trim();
    setSearchedTermDisplay(currentSearch);
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const actionResult = await searchPharmaciesAction(currentSearch);
      if (actionResult.error) {
        setError(actionResult.error);
        setResults([]);
      } else {
        setResults(actionResult.data || []);
        if ((actionResult.data || []).length === 0) {
            setError(`No results found for "${currentSearch}". Try checking the spelling or using a more generic name.`);
        }
      }
    } catch (err: any) {
      console.error("Medical search error:", err);
      setError("An unexpected error occurred while fetching results. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-2 px-0 md:px-4 space-y-6">
      <Card className="shadow-lg border-border bg-card">
        <CardHeader className="text-center p-6 border-b border-border">
            <div className="flex items-center justify-center gap-2.5 mb-2">
                <Pill className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Medicine Price Finder</CardTitle>
            </div>
            <CardDescription className="text-md text-muted-foreground">
                Search for medicine prices across various online pharmacies.
            </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter medicine name (e.g., Calpol, Paracetamol)"
              className="flex-grow text-base py-3 px-4 rounded-md focus:ring-2 focus:ring-primary/80 h-12"
              disabled={isLoading}
              aria-label="Medicine search input"
            />
            <Button 
                type="submit" 
                className="w-full sm:w-auto text-base py-3 px-6 h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all duration-300" 
                disabled={isLoading || !searchTerm.trim()}
            >
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </form>

          {isLoading && (
            <div className="text-center py-10 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-md font-medium text-muted-foreground">Searching for "<span className="text-primary">{searchedTermDisplay}</span>"...</p>
              <p className="text-sm text-muted-foreground">Fetching live data, this may take a moment.</p>
            </div>
          )}

          {error && !isLoading && (
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Search Information</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLoading && results.length > 0 && (
            <ScrollArea className="h-[50vh] max-h-[600px] pr-3 -mr-3 border rounded-md p-1">
              <div className="space-y-3 p-3">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                    Results for "<span className="text-primary">{searchedTermDisplay}</span>"
                </h3>
                {results.map((item, index) => (
                  <Card key={index} className="shadow-sm hover:shadow-md transition-shadow duration-200 border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground font-medium">{item.pharmacy}</p>
                      <h4 className="text-md font-semibold text-foreground mt-0.5 truncate" title={item.name}>
                        {item.name}
                      </h4>
                      <p className="text-lg font-bold text-primary mt-1">{item.price}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
          
          {!isLoading && !error && results.length === 0 && searchedTermDisplay && (
             <Alert className="my-4">
              <Pill className="h-4 w-4" />
              <AlertTitle>No Listings Found</AlertTitle>
              <AlertDescription>
                We couldn't find any listings for "{searchedTermDisplay}". This could be due to:
                <ul className="list-disc pl-5 mt-1 text-xs">
                    <li>The medicine not being available on the searched platforms.</li>
                    <li>Minor variations in spelling or naming.</li>
                    <li>Temporary issues with accessing pharmacy websites or outdated selectors.</li>
                </ul>
                 Please try checking the spelling, using a more generic name, or try again later.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
       <p className="text-xs text-muted-foreground text-center mt-4 px-4">
            Disclaimer: Prices and availability are fetched in real-time and subject to change. This tool is for informational purposes only. Accuracy depends on the current structure of pharmacy websites.
        </p>
    </div>
  );
}

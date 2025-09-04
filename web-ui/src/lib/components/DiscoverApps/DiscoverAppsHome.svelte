<script>
  import * as icons from '@lucide/svelte/icons'; 
	  import { writable, derived } from 'svelte/store';
	import { Input } from '$components/ui/input';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuRadioGroup,
		DropdownMenuRadioItem
	} from '$components/ui/dropdown-menu';
	import { Button } from '$components/ui/button';
	import { onMount } from 'svelte';
	import domainData from "$data/domains-1k-wiki-info.js";

	let domains = writable([]);
	let loading = true;

	let searchTerm = writable('');
	let sortBy = writable('popularity');
	let selectedCategory = writable(null);
	let showFavorites = writable(false);
	const siteCategories = [
  { id: 0, label: "All", icon: "Grid" },
  { id: 1, label: "Shopping", icon: "ShoppingBag" },
  { id: 2, label: "Search", icon: "Search" },
  { id: 3, label: "Technology", icon: "Cpu" },
  { id: 4, label: "News", icon: "Newspaper" },
  { id: 5, label: "Social", icon: "Users" },
  { id: 6, label: "Finance", icon: "Wallet" },
  { id: 7, label: "Travel", icon: "Plane" },
  { id: 8, label: "Entertainment", icon: "Film" },
  { id: 9, label: "Education", icon: "BookOpen" },
  { id: 10, label: "Health", icon: "HeartPulse" },
  { id: 11, label: "Sports", icon: "Dumbbell" },
  { id: 12, label: "Real Estate", icon: "Home" },
  { id: 13, label: "Food & Drink", icon: "Pizza" },
  { id: 14, label: "Science", icon: "Atom" },
  { id: 15, label: "Automotive", icon: "Car" },
  { id: 16, label: "Government", icon: "Landmark" }
]

	onMount(async () => {
		// Initialize domains with favorite flag
		const initialDomains = domainData.map(domain => ({
			...domain,
			favorite: false
		}));
		
		// Load favorites from localStorage if available
		const savedFavorites = localStorage.getItem('domainFavorites');
		if (savedFavorites) {
			try {
				const favoriteIds = JSON.parse(savedFavorites);
				// Mark domains that are favorites
				initialDomains.forEach(domain => {
					if (favoriteIds.includes(domain.title)) {
						domain.favorite = true;
					}
				});
			} catch (e) {
				console.error("Error loading favorites from localStorage:", e);
			}
		}
		
		domains.set(initialDomains);
		loading = false;
	});

	// Debug logging for favorite changes
	$: {
		if (typeof localStorage !== 'undefined' && $domains?.length > 0) {
			const favoriteIds = $domains
				.filter(domain => domain.favorite)
				.map(domain => domain.title);
			console.log("Saving favorites:", favoriteIds);
			localStorage.setItem('domainFavorites', JSON.stringify(favoriteIds));
		}
	}

	$: filteredDomains = derived(
		[domains, searchTerm, sortBy, selectedCategory, showFavorites],
		([$domains, $searchTerm, $sortBy, $selectedCategory, $showFavorites]) => {
			let data = $domains;
			
			// Handle favorites view first
			if ($showFavorites) {
				data = data.filter(domain => domain.favorite);
			} else if ($selectedCategory) {
				data = data.filter((domain) => domain.category === $selectedCategory);
			}
			
			// Then apply search filter
			if ($searchTerm) {
				data = data.filter(
					(domain) =>
						domain.title?.toLowerCase().includes($searchTerm.toLowerCase()) ||
						domain.summary?.toLowerCase().includes($searchTerm.toLowerCase()) ||
						domain.domain?.toLowerCase().includes($searchTerm.toLowerCase())
				);
			}
			
			// Apply sorting
			switch ($sortBy) {
				case 'alphabetical':
					data = data.sort((a, b) => a.title?.localeCompare(b.title));
					break;
				case 'popular':
					data = data.sort((a, b) => (b.rank || 999) - (a.rank || 999));
					break;
				case 'newest':
					data = data.sort((a, b) => (b.new ? 1 : -1) - (a.new ? 1 : -1));
					break;
			}
			return data;
		}
	);

	function handleFavorite(domainTitle) {
		domains.update(($domains) => {
			// Clone the domains array
			const updatedDomains = $domains.map(domain => {
				// Find the domain to update
				if (domain.title === domainTitle) {
					// Create a new object with favorite toggled
					return {
						...domain,
						favorite: !domain.favorite
					};
				}
				return domain;
			});
			return updatedDomains;
		});
	}

	function handleCategoryClick(category) {
		if (category === 'favorites') {
			showFavorites.set(true);
			selectedCategory.set(null);
		} else {
			showFavorites.set(false);
			selectedCategory.set(category === 'All' ? null : category);
		}
	}
	
	function getFavoriteCount() {
		return $domains.filter(domain => domain.favorite).length;
	}
</script>

<div class="flex flex-col h-screen bg-background text-foreground">
	<header class="bg-primary text-primary-foreground py-4 px-6 shadow-md">
		<div class="max-w-7xl mx-auto flex items-center justify-between">
			<div class="flex items-center gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M2 20V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-6"></path><path d="M2 20h6"></path><path d="M6 16v4"></path><circle cx="10" cy="10" r="4"></circle><path d="m22 22-8.2-8.2"></path></svg>
				<h1 class="text-2xl font-bold">Domain Directory</h1>
			</div>
			<div class="flex items-center gap-4">
				<div class="relative">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-foreground/60 w-4 h-4"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
					<Input
						placeholder="Search domains..."
						bind:value={$searchTerm}
						class="bg-primary-foreground/10 text-primary-foreground rounded-lg pl-10 pr-4 py-2 w-64 border-primary-foreground/20 focus:border-primary-foreground/40 placeholder:text-primary-foreground/60"
					/>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" class="flex items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="w-5 h-5"
							>
								<line x1="10" x2="21" y1="6" y2="6" />
								<line x1="10" x2="21" y1="12" y2="12" />
								<line x1="10" x2="21" y1="18" y2="18" />
								<path d="M4 6h1v4" />
								<path d="M4 10h2" />
								<path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
							</svg>
							Sort: {$sortBy === 'alphabetical' ? 'A-Z' : $sortBy === 'popular' ? 'Popular' : 'Newest'}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent class="w-48">
						<DropdownMenuRadioGroup bind:value={$sortBy}>
							<DropdownMenuRadioItem value="alphabetical">Alphabetical</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="popular">Most Popular</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	</header>

	<div class="flex flex-1 overflow-hidden">
		<aside class="bg-card text-card-foreground p-4 border-r w-60 overflow-y-auto">
			<div class="mb-6">
				<h2 class="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Collections</h2>
				<div class="grid gap-1">
					<Button
						variant={$showFavorites ? 'default' : 'ghost'}
						onclick={() => handleCategoryClick('favorites')}
						class="justify-start h-9 text-sm w-full"
						size="sm"
					>
						<svg 
							xmlns="http://www.w3.org/2000/svg" 
							width="24" 
							height="24" 
							viewBox="0 0 24 24" 
							fill={$showFavorites ? "currentColor" : "none"}
							stroke="currentColor" 
							stroke-width="2" 
							stroke-linecap="round" 
							stroke-linejoin="round" 
							class="w-4 h-4 mr-2"
						>
							<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
						</svg>
						Favorites
						{#if getFavoriteCount() > 0}
							<span class="ml-auto bg-muted rounded-full px-2 py-0.5 text-xs">{getFavoriteCount()}</span>
						{/if}
					</Button>
				</div>
			</div>

			<h2 class="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Categories</h2>
			<div class="grid gap-1">
				{#each siteCategories as {label, icon}}
					<Button
						variant={!$showFavorites && $selectedCategory === (label === 'All' ? null : label.toLowerCase())
							? 'default'
							: 'ghost'}
						onclick={() => handleCategoryClick(label === 'All' ? null : label.toLowerCase())}
						class="justify-start h-9 text-sm"
						size="sm"
					>
					<svelte:component this={icons[icon]} class="w-4 h-4 mr-2" />
						{label}
					</Button>
				{/each}
			</div>
		</aside>
		
		<main class="flex-1 overflow-auto p-6">
			{#if loading}
				<div class="flex items-center justify-center h-full">
					<div class="text-center">
						<svg class="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						<p class="text-muted-foreground">Loading domains...</p>
					</div>
				</div>
			{:else if $filteredDomains.length === 0}
				<div class="flex items-center justify-center h-full">
					<div class="text-center max-w-md">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 mx-auto mb-4 text-muted-foreground"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
						<h2 class="text-xl font-semibold mb-2">No domains found</h2>
						<p class="text-muted-foreground">
							{#if $showFavorites}
								You haven't added any favorites yet. Heart domains you like to add them to your favorites.
							{:else}
								Try adjusting your search or category filters to find what you're looking for.
							{/if}
						</p>
					</div>
				</div>
			{:else}
				<div class="mb-4">
					<h2 class="text-xl font-medium">
						{#if $showFavorites}
							Favorite Domains
						{:else if $selectedCategory}
							{$selectedCategory.charAt(0).toUpperCase() + $selectedCategory.slice(1)} Domains
						{:else}
							All Domains
						{/if}
						<span class="text-muted-foreground text-base font-normal ml-2">({$filteredDomains.length})</span>
					</h2>
				</div>
				<div class="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{#each $filteredDomains as domain}
						<div class="bg-card rounded-lg overflow-hidden shadow-sm border hover:shadow-md transition-shadow duration-200 flex flex-col">
							<div class="p-4 border-b flex items-center justify-between">
								<div class="flex items-start gap-3">
									{#if domain.favicon}
										<img src={domain.favicon} width={24} height={24} class="rounded-full" alt={domain.title} />
									{:else}
										<div class="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs text-primary font-bold">
											{domain.title.charAt(0)}
										</div>
									{/if}
									<div>
										<h3 class="font-medium">{domain.title}</h3>
										<div class="text-xs text-muted-foreground mt-0.5">{domain.domain}</div>
									</div>
								</div>
								<div class="flex items-center gap-2">
									{#if domain.rank}
										<div class="bg-muted px-2 py-0.5 rounded-full text-xs font-medium">#{domain.rank}</div>
									{/if}
									<Button
										size="icon"
										variant={domain.favorite ? "default" : "ghost"}
										class="h-8 w-8"
										onclick={() => handleFavorite(domain.title)}
										title={domain.favorite ? 'Remove from favorites' : 'Add to favorites'}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill={domain.favorite ? "red" : "none"}
											stroke={domain.favorite ? "red" : "currentColor"}
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="w-4 h-4 transition-colors"
										>
											<path
												d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
											/>
										</svg>
									</Button>
								</div>
							</div>
							
							<div class="p-4 flex-1">
								<div class="text-sm text-muted-foreground line-clamp-4">
									{@html domain.summary?.slice(0, 200) + (domain.summary?.length > 200 ? '...' : '')}
								</div>
							</div>
							
							<div class="p-3 bg-muted/30 flex items-center justify-between border-t">
								<div class="flex space-x-1">
									{#if domain.category}
										<div class="bg-muted px-2 py-1 rounded text-xs font-medium text-muted-foreground">{domain.category}</div>
									{/if}
									{#if domain.new}
										<div class="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">New</div>
									{/if}
								</div>
								{#if domain.wikipedia}
									<Button
										size="icon"
										variant="ghost"
										class="h-8 w-8"
										onclick={() => window.open(domain.wikipedia, '_blank')}
										title="View on Wikipedia"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="w-4 h-4"
										>
											<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
											<path d="m2 12 5.6 5.6a9 9 0 0 0 12.8 0L20 12"></path>
											<path d="M13 2.05v5.4a2 2 0 0 0 2.9 1.78l.33-.18"></path>
											<path d="M11 2.05v5.4a2 2 0 0 1-2.9 1.78l-.33-.18"></path>
											<path d="M18 14v5.76"></path>
											<path d="M7 13v6.76"></path>
										</svg>
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</main>
	</div>
</div>
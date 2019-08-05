# TopPrioritiesByBusinesUnit
A Rally Cardboard where the columns are parent folders in the project hierarchy, and the cards are the top X portfolio items for each family of folders.

This cardboard should allow the user to:
1) Set the starting project folder - and the columns will be driven by the direct children of that choice.
2) Select the type of portfolio item being displayed (my options are 'Portfolio Epic', 'Solution Epic', and Feature)
3) Set the top X count of items in Rank order that will be displayed on each column. Currently the user is asking to show *only* the top 5 items for each column. (NOTE: PortfolioItems from child projects within the same project family [children of one of the original direct child of the starting project folder] should be displayed - if the item's rank is within the top X for the app. [The Top X cutoff should be app-wide, not column-specific.]
4) Change the Portfolio Item type being displayed via a drop-down on the app. Currently the user only wants either of the 'Epics' ['Portfolio Epic', 'Solution Epic']
5) Filter based on two other drop-down options:
   5.1) PortfolioItem State: drop-down multi-select preferred (one of the preferred choices has 3 State selections, the other has 1)
   5.2) A custom drop-down list value: Compliance. (Blank, Yes, No) (for some reason, not a Boolean)
   5.3) What does it take to enable "Save[d] Views"?
6) We can hard-code the card fields, but we'd also like to be able to "Show Fields" and then be able so Save (as part of saving the filter expressions) the column selections.
7) The view can be read-only, but needs to be able to open the detail page for drill-down into details.
8) The Cardboard never needs to be displayed as a list. Always as a CardBoard.

# Project description

ACE Eye is a web app used to track active tours across a region and across time.

# Types of users

In order to use the application it is necessary to register an account and wait for approval from staff. The restriction of access is needed because the data shown on the website is sensitive.

There are currently three types of accounts arranged in a hierarchical order (from lowest to highest): Viewer, Manager, and Admin. An account higher in the hierarchy has all the rights account lower than it have, and then some.

## Viewer

This account is meant for the majority of users. The 'Viewer' has access only to the Home page which enables viewing of active tours for a chosen date.

## Manager

This account carries the same rights as the 'Viewer' account. Additionaly, the 'Manager' can manage accounts and account requests.

## Admin

This account carries the same rights as the 'Manager' account. Additionaly, the 'Admin' has the ability to edit routes for tour programs and view the statistics page.

# Features

- All users can view all active tours for a chosen date, layed out on a map, the day's route shown for each one.
- All users can select what information they want to view at a glance, whether it be the tour name, the tour leader, the number of guests, and more, or any combination of these.
- All users can select a tour on the map to view the detailed information.
- Managers and higher can view lists of account requests, accounts with expired access rights, and activated accounts. They can approve or reject account requests, change the type of an account, revoke access rights to an activated account, or renew access rights to an expired one.
- Admins can add new locations to the database. A location has to be added if a tour program visits the place for a hotel stay, activity or flight.
- Admins can view all tour programs and edit them. The editing process includes adding/removing days, and adding points of various types to a day.
- Admins can view the statistics page which show some interesting information compiled from the available data.

# Tech

The whole platform is built using Typescript, using Angular for the front-end and Express for the back-end.

The data is stored in a MySQL database.

The platform utilises the Google Maps Javascript API to draw the tour routes on a map. It also uses the Google Drive API to fetch the data files.

# Author

- Andrija Kolić ([Github](https://github.com/k0lic))

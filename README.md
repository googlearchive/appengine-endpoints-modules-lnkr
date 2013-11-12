appengine-endpoints-modules-lnkr
================================

## Project
####Metadata
* Version: 1.0 November 2013
* Author: [Daniel Acton](http://google.com/+DanielActon)
* For any comments, queries or suggestions, feel free to contact Daniel Acton

####Description
Lnkr is a simple web application that is based on Google App Engine and shows a variety of concepts:
* Google App Engine
  * Google Cloud Endpoints
  * Modules
  * Memcache
  * Task Queues
  * Datastore
* HTML5
* SASS
* CSS3
* Responsive Design
* Integration with Google+
* Google Chart API

The application is a real-world example aimed at developers wishing to start using Google App Engine or see samples of Google App Engine concepts. There is a running instance at [lnkr.co.za](http://lnkr.co.za). To use this source code, download it, modify it (as you wish) and deploy to your own Google App Engine instance.

## Project Setup, Installation, and Configuration
All information about Google App Engine projects, e.g. building and running applications, is available online on the Google App Engine developer site: [developers.google.com/appengine](https://developers.google.com/appengine). Here, we'll use APPENGINE_SDK_DIR to indicate the directory in which your App Engine SDK is installed (i.e. the path to the App Engine SDK utilities).

### Getting started
#### Preparing your environment
* Install the Google App Engine SDK for Python, downloadable from [developers.google.com/appengine/downloads#Google_App_Engine_SDK_for_Python](https://developers.google.com/appengine/downloads#Google_App_Engine_SDK_for_Python)
* *(OPTIONAL)* Since the source code for the project is available on Github, you might find it easier to use this source code using Git. To install Git, follow the instructions at [git-scm.org](http://git-scm.org).
* *(OPTIONAL)* If you want to learn SASS (this project uses SASS), install it using the instructions at [sass-lang.com](http://sass-lang.com).
* *(OPTIONAL)* This application uses a custom minified version of the Google Closure Library. If you want to learn and use Google Closure library, download and install the Google Closure Library from [code.google.com/p/closure-library/](https://code.google.com/p/closure-library/) and the Google Closure Compiler from [code.google.com/p/closure-compiler/](https://code.google.com/p/closure-compiler/)

#### Download the source code
* If you're using Git
  * Get the source code from the Github repository into a directory of your choice, using this command:
>        git clone https://github.com/GoogleCloudPlatform/appengine-endpoints-modules-lnkr.git
* If you're not using Git, download the source as a zip file from [github.com/GoogleCloudPlatform/appengine-endpoints-modules-lnkr/archive/master.zip](https://github.com/GoogleCloudPlatform/appengine-endpoints-modules-lnkr/archive/master.zip).

## Deploying
####Running locally
* Generate the Google Cloud Endpoint Client Library using the instructions at [developers.google.com/appengine/docs/python/endpoints/gen_clients](https://developers.google.com/appengine/docs/python/endpoints/gen_clients) (all on one line, the \ are used to break a single command across multiple lines):
>     APPENGINE_SDK_DIR/endpointscfg.py \
>       get_client_lib java -o . -f rest api.ShortLinkApi
* Run the development server using this command (all on one line, the \ are used to break a single command across multiple lines):
>     APPENGINE_SDK_DIR/dev_appserver.py dispatch.yaml \
>       data_module.yaml static_module.yaml api_module.yaml \
>       redirect_module.yaml

####Deploying to Google App Engine
* Only required the first time you use App Engine with your Google account
  * Visit the Google App Engine console at [appengine.google.com](https://appengine.google.com)
  * Sign in using your Google Account
  * Create your own Google App Engine application in the Google App Engine console, and note the application ID that you chose
* Generate the Google Cloud Endpoints Client Library as described above
* Modify the index.html file around line 17, change
>     ROOT = 'https://one-dot-api-dot-avian-silo-347.appspot.com/_ah/api';
* to
>     ROOT = 'https://one-dot-api-dot-yourappid.appspot.com/_ah/api';
* replacing **yourappid** with the application ID you chose when setting up the application in the Google App Engine console
* In all of the `yaml` files, replace the the value of the `application` parameter with your application ID, so change
>     application: avian-silo-347
* to
>     application: yourappid
* where **yourappid** is the application ID you chose
* Deploy to Google App Engine using the following commands:
>     APPENGINE_SDK_DIR/appcfg.py update static_module.yaml api_module.yaml redirect_module.yaml data_module.yaml
>     APPENGINE_SDK_DIR/appcfg.py update_dispatch .


### Optional tasks
#### SASS
This project makes use of SASS which is a great way of making CSS easier to use. Instructions for installing SASS are available from (see [sass-lang.com](http://sass-lang.com)).
* The main SASS file is `style/main.scss`
* If you want to make changes to the style, modify `style/main.scss` and use the following command to get the CSS to use (from your project working directory):
>     cd style
>     sass main.scss > main.css
* Please note that this command will overwrite the `main.css` file that is used by the project

#### Google Closure Library minification
This application uses some of the features of the Google Closure Library. In order to minimize the download size of the application, ClosureBuilder is used to create a single minified Javascript file for the web application. There are 2 source Javascript files: `js/site.js` and `js/data.js`. These files are compiled and minified into `lnkr-compiled.js`, which is the script used by the web application.

If you'd like to explore this, you can make changes to either `js/site.js` or `js/data.js`, and then follow these instructions to compile and minify the code into the single file used .
* First, you'll need to install the Google Closure Library from [code.google.com/p/closure-library/](https://code.google.com/p/closure-library/).
* Then you'll need to install the Google Closure Compiler from [code.google.com/p/closure-compiler/](https://code.google.com/p/closure-compiler/).
* To compile and minify the code:
  * Assume that CLOSURE_LIB_DIR is the directory in which you installed the Google Closure Library
  * Assume that CLOSURE_COMP_DIR is the directory in which you installed the Google Closure Library
  * Assume that WORKING_DIR is the directory in which you downloaded the source code for this application
>     CLOSURE_LIB_DIR/closure/bin/build/closurebuilder.py \
>        --root=CLOSURE_LIB_DIR \
>        --root=WOKRING_DIR/js/ \
>        --namespace=lnkr
>        --namespace=lnkr.data
>        --output_mode=compiled \
>        --compiler_jar=CLOSURE_COMP_DIR/compiler.jar \
>        > WORKING_DIR/js/lnkr-compiled.js

## Contributing changes

* See CONTRIB.md

## Licensing

* See LICENSE


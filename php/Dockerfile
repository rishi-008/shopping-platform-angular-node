FROM php:8.2-apache

RUN docker-php-ext-install mysqli

# Optional: nicer error output during verification
RUN { \
    echo 'display_errors=On'; \
    echo 'display_startup_errors=On'; \
    echo 'error_reporting=E_ALL'; \
  } > /usr/local/etc/php/conf.d/99-dev.ini

# If you later need URL rewriting
RUN a2enmod rewrite

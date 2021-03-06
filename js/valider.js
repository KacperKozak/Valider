/*!
 * Valider - HTML5 Form Validation
 * @author Kacper Kozak
 * @version 1.2.2
 * @license MIT
 */

(function ($) {
    'use strict';

    var Valider = function (form, config) {

        var self = this;

        // Extend config
        this.config = $.extend({
            onErrors: function (errors) {},
            onInputError: function (error, input) {},
            onInputPass: function (input) {},
            lang: $('html').attr('lang') || 'pl'
        }, config || {});

        // Store incorrect inputs for onErrors callback
        this.incorrectInputs = {};

        // Cache form and inputs
        this.form = form;
        this.inputs = form.find(':input:not(:button, :image, :reset, :submit, :disabled)');

        this.inputs.each(function () {
            var input = $(this);
            input.data('valider', {
                triggerError: function (key) {
                    self.callInputError(key, input);
                }
            });
        });

        // Bind validation on submit and disable native HTML5 form validation
        form.on('submit.valider', function (event) {
            self.validate(self.inputs, event);
        }).attr('novalidate', 'novalidate');

        this.inputs.on('change.valider, blur.valider', function () {
            var input = $(this);
            setTimeout(function () {
                self.validateInput(input);
            }, 350);
        });

        this.inputs.on('validate.valider', function () {
            var input = $(this);
            self.validateInput(input);
        });

        return this;
    };

    Valider.prototype = {

        regex: {
            'number': /^-?[0-9]*(\.[0-9]+)?$/,
            'email': /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
            'url': /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i
        },

        errors: {
            en: {
                '*'            : 'Incorrect value',
                '[required]'   : 'Field :name is required',
                '[type=email]' : 'Invalid email address',
                '[type=number]': 'Value must be a number',
                '[type=url]'   : 'Invalid URL',
                '[max]'        : 'The maximum value is :max',
                '[min]'        : 'The minimum value is :min',
                '[data-equals]': 'The value is not the same as the field :equals',
                '[data-limit]' : 'The maximum length is :limit characters'
            },
            pl: {
                '*'            : 'Niepoprawna wartość',
                '[required]'   : 'Pole jest wymagane',
                '[type=email]' : 'Błędny adres e-mail',
                '[type=number]': 'Wartość musi być liczbą',
                '[type=url]'   : 'Niepoprawny adres WWW',
                '[max]'        : 'Maksymalna wartość to :max',
                '[min]'        : 'Minimala wartość to :min',
                '[data-equals]': 'Wartość nie jest taka sama jak pole :equals',
                '[data-limit]' : 'Maksymalna długość to :limit znaków'
            }
        },

        filters: {
            '[required]': function (input, val) {
                var name;
                if (input.is(':checkbox') || input.is(':radio')) {
                    // Nazwa bez tablicy
                    name = input.attr('name').match(/^[^\[]+/)[0];
                    return !!this.form.find('input[type="' + input.attr('type') + '"][name^="' + name + '"]:checked').length;
                }
                return !!val;
            },
            '[type=email], [data-type=email]': function (input, val) {
                return val === '' || this.regex.email.test(val);
            },
            '[type=number], [data-type=number]': function (input, val) {
                var valDot = val.replace(',', '.');
                if (valDot !== val) {
                    input.val(valDot);
                }
                return val === '' || this.regex.number.test(valDot);
            },
            '[type=url], [data-type=url]': function (input, val) {
                return val === '' || this.regex.url.test(val);
            },
            '[max], [data-type=max]': function (input, val) {
                var max = input.attr('max') || input.data('max');
                return val === '' || (parseFloat(val) <= parseFloat(max));
            },
            '[min], [data-type=min]': function (input, val) {
                var min = input.attr('min') || input.data('min');
                return val === '' || (parseFloat(val) >= parseFloat(min));
            },
            '[pattern]': function (input, val) {
                return val === '' || new RegExp('^' + input.attr('pattern') + '$').test(val);
            },
            '[data-regex]': function (input, val) {
                return val === '' || this.regex[input.data('regex')].test(val);
            },
            '[data-equals]': function (input, val) {
                var input2 = this.inputs.filter('[name="' + input.data('equals') + '"]');
                return val === input2.val();
            },
            '[data-limit]': function (input, val) {
                return val === '' || input.data('limit') >= val.length;
            }
        },

        getError: function (key, input, msg) {

            var error = msg ? msg : input.data('message'),
                // Attributes - replace :names
                attrs = {
                    'name': input.data('name') || input.attr('name'),
                    'val': input.val(),
                    'min': input.attr('min') || input.data('min'),
                    'max': input.attr('max') || input.data('max'),
                    'equals': input.data('equalsName') || input.data('equals'),
                    'limit': input.data('limit')
                },
                type;

            // No error?
            if (!error) {
                if (key === '[data-regex]') {
                    // Fix key with data-regex
                    key = 'regex:' + input.data('regex');
                } else {
                    // Fix key with data-type
                    key = key.split(',')[0];
                }
                // Get error
                error = this.errors[this.config.lang][key];
                // still don't have
                if (!error) {
                    // data type
                    type = input.data('type');
                    if (type) {
                        error = this.errors[this.config.lang]['[type=' + type + ']'];
                    }
                    // default error
                    if (!error) {
                        error = this.errors[this.config.lang]['*'];
                    }
                }
            }

            // Replace all attributes
            $.each(attrs, function (key, value) {
                error = error.replace(':' + key, value);
            });

            return error;
        },

        // Call user error callback function
        callInputError: function (key, input, msg) {
            var error = this.getError(key, input, msg);
            this.config.onInputError.call(input, error, input);
            return error;
        },

        // Call user pass callback function
        callInputPass: function (input) {
            this.config.onInputPass.call(input, input);
        },

        // Validate one input
        validateInput: function (input) {
            var self = this,
                status = true;

            $.each(this.filters, function (key, fn) {
                if (input.is(key) && !fn.call(self, input, input.val())) {
                    self.bindInput(input);
                    status = self.callInputError(key, input);
                    return false;
                }
            });

            return status;
        },

        // Bind input to recheck value on change
        bindInput: function (input) {
            var self = this,
                timer;
            // Remove all to prevent multiple binds
            this.unBindInput(input);
            // Bind all possible events and debounce them
            input.on('keyup.valider-input change.valider-input click.valider-input', function () {
                clearTimeout(timer);
                timer = setTimeout(function () {
                    var check = self.validateInput(input),
                        name = input.attr('name');
                    if (check === true) {
                        // input is valid - delete error, unbind and callback
                        delete self.incorrectInputs[name];
                        self.unBindInput(input);
                        self.callInputPass(input);
                    } else {
                        // Save error name
                        self.incorrectInputs[name] = check;
                    }
                }, 20);
            });
        },

        // Unbind input
        unBindInput: function (input) {
            input.off('.valider-input');
        },

        // Validate all inputs in form
        validate: function (inputs, event) {
            var self = this,
                isError = false;

            inputs.each(function () {
                var input = $(this),
                    name = input.attr('name'),
                    check = self.validateInput(input);

                if (check !== true) {
                    // Save error name
                    self.incorrectInputs[name] = check;
                    isError = true;
                } else if (self.incorrectInputs[name]) {
                    // input is valid - delete error, unbind and callback
                    delete self.incorrectInputs[name];
                    self.unBindInput(input);
                    self.callInputPass(input);
                }
            });

            // If some input has error, prevent submit
            if (isError) {
                this.config.onErrors.call(null, this.incorrectInputs, inputs);
                if (event) {
                    event.preventDefault();
                }
            }
        },

        invalidate: function (obj) {
            var self = this,
                errors = $.extend({}, obj),
                inputs = this.inputs;

            if (this.lastInvalidateErrors) {
                $.each(this.lastInvalidateErrors, function (key, value) {
                    self.callInputPass(inputs.filter('[name="' + key + '"]'));
                });
            }

            $.each(errors, function (key, value) {
                self.callInputError(false, inputs.filter('[name="' + key + '"]'), value);
            });

            this.lastInvalidateErrors = errors;
        }

    };


    $.Valider = {
        addLang: function (lng) {
            $.extend(true, Valider.prototype.errors, lng);
            return this;
        },
        addRegex: function (name, regex) {
            var filterObj;
            if (typeof name === 'object') {
                $.extend(Valider.prototype.regex, name);
            } else {
                filterObj = {};
                filterObj[name] = regex;
                $.extend(Valider.prototype.regex, filterObj);
            }
            return this;
        },
        addFilter: function (filter, fn) {
            var filterObj;
            if (typeof filter === 'object') {
                $.extend(Valider.prototype.filters, filter);
            } else {
                filterObj = {};
                filterObj[filter] = fn;
                $.extend(Valider.prototype.filters, filterObj);
            }
            return this;
        }
    };


    // jQuery Plugin
    $.fn.Valider = function (conf) {
        return this.each(function () {
            var form = $(this);
            if (form.is('form')) {
                form.data('valider', new Valider(form, conf));
            }
        });
    };

})(window.jQuery);

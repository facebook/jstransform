/**
 * Copyright 2013 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @emails dmitrys@fb.com javascript@lists.facebook.com
 */

/*jshint evil:true, unused: false*/
/* global describe, beforeEach, expect, it*/



describe('es6-spread-operator-visitors', function() {
  var visitors,
      transformFn;
  var spreadTemplates = require('../spread-templates');
  
  beforeEach(function() {
    visitors = require('../es6-spread-operator-visitors').visitorList;
    transformFn = require('../../src/jstransform').transform;
  });
  
  function transform(code) {
    return transformFn(visitors, code).code;
  }

  function expectTransform(code, result) {
    expect(transform(code)).toEqual(result);
  }
  

  describe('within array', function () {
    it('should create an array concatanation of each object in array, and each parameters ', function () {
       expect(eval(transform('[1, 2, ...[3, 4]]'))).toEqual([1, 2, 3, 4]);
    });
    
    it('should works with only spread', function () {
        expect(eval(transform('[...[1, 2]]'))).toEqual([1, 2]);
    });
    
    it('should throws an error if spread a non object ', function () {
       expect(function () {
         eval(transform('[1, 2, ...{ a: 5 }'));
       }).toThrow();
    });
    
    it('should throws an error if passing a non array', function () {
       expect(function () {
         eval(transform('[1, 2, ...{ a: 5 }'));
       }).toThrow();
    });
    
    it('should accept anything that resolve to an array', function () {
      expect(eval(transform('[1, 2, ...(function () { return [3, 4] })()]'))).toEqual([1, 2, 3, 4]);
    });
    
    it('should ouput the following code source', function () {
      expectTransform(
        '[1, 2, ...[3, 4]]',
        [
          spreadTemplates.outerArrayBegin,
          '[',
            '1, 2, ',
            spreadTemplates.spreadLiteralBegin, '[3, 4]', spreadTemplates.spreadLiteralEnd,
          ']',
          spreadTemplates.outerArrayEnd,
        ].join(''));
    });
    
    
    it('should keep lines break and comments', function () {
      expectTransform(
        ['[1 /*mycomments*/, 2,',
         '...[3,',
         ' 4]]'
        ].join('\n'),
        [
          spreadTemplates.outerArrayBegin + '[1 /*mycomments*/, 2,',
          spreadTemplates.spreadLiteralBegin + '[3,',
          ' 4]'+ spreadTemplates.spreadLiteralEnd + ']' + spreadTemplates.outerArrayEnd
        ].join('\n'));
    });
  });
  
  
  describe('within call expression', function () {
    
    function returnArgs () {
      return Array.prototype.slice.call(arguments);
    }
    
    
    it('should pass spread array as parameters  ', function () {
      expect(eval(transform('returnArgs(1, 2, ...[3, 4])'))).toEqual([1, 2, 3, 4]);
    });
   
    it('should ouput the following code source', function () {
      expectTransform(
        'returnArgs(1, 2,...[3, 4])',
        [
          'returnArgs',
          spreadTemplates.callExpressionBegin(),
          '[',
            '1, 2,',
            spreadTemplates.spreadLiteralBegin, '[3, 4]', spreadTemplates.spreadLiteralEnd,
          ']',
          spreadTemplates.callExpressionEnd
        ].join(''));
    });
    
    
    it('should keep lines break and comments', function () {
      expectTransform(
        [
          'returnArgs  /*comments*/(',
          ' 1, 2,',
          ' ...[3, 4]',
          ')'
        ].join('\n'),
        [
          'returnArgs' + spreadTemplates.callExpressionBegin() + '  /*comments*/[',
          ' 1, 2,',
          ' ' + spreadTemplates.spreadLiteralBegin + '[3, 4]' + spreadTemplates.spreadLiteralEnd,
          ']'+ spreadTemplates.callExpressionEnd
        ].join('\n'));
    });
    
    it('should keep intact comments with \'(\' && \')\' ', function () {
      expectTransform(
        [
          'returnArgs  /*comments (*/( 1, 2,',
          '...[3, 4] //comments )',
          ')'
        ].join('\n'),
        [
          'returnArgs' + spreadTemplates.callExpressionBegin() + '  /*comments (*/[ 1, 2,',
          spreadTemplates.spreadLiteralBegin + '[3, 4]' + spreadTemplates.spreadLiteralEnd + ' //comments )',
          ']'+ spreadTemplates.callExpressionEnd
        ].join('\n'));
    });
  });
  
  
  describe('within method call expression', function () {
    
    var object = {
      returnArgsAndThis: function() {
        return Array.prototype.slice.call(arguments).concat(this);
      }
    };
    
    
    it('should keep the \'this\' context in case of method call ', function () {
      expect(eval(transform('object.returnArgsAndThis(1, 2, ...[3, 4])'))).toEqual([1, 2, 3, 4, object]);
    });
    
    it('should keep the \'this\' context in case of computed method call ', function () {
      expect(eval(transform('object[\'return\'+\'ArgsAndThis\'](1, 2, ...[3, 4])'))).toEqual([1, 2, 3, 4, object]);
    });
    
    
    it('should ouput the following code source', function () {
      var transformedCode = transform('object.returnArgsAndThis(1, 2,...[3, 4])');
      transformedCode = transformedCode.replace(/_this\d*/g, '_this');
      expect(transformedCode).toBe([
        spreadTemplates.closureStart,
          'var _this = object; ',
          'return _this.returnArgsAndThis', spreadTemplates.callExpressionBegin('_this'),
          '[',
            '1, 2,',
            spreadTemplates.spreadLiteralBegin, '[3, 4]', spreadTemplates.spreadLiteralEnd,
          ']',
          spreadTemplates.callExpressionEnd,
        spreadTemplates.closureEnd
      ].join(''));
    });
   
    
  });
  
  
  describe('within new  expression', function () {
    
    function MyClass(a, b) {
      this.a = a;
      this.b = b;
    }
    
    
    it('should pass spread array as arguments of the construtor, and produce an object instance of called function', function () {
      var result = eval(transform('new MyClass(...[1, 2])'));
      expect(result).toEqual({
        a: 1,
        b: 2
      });
      expect(result instanceof MyClass).toBe(true);
    });
    
    
    it('should ouput the following code source', function () {
      var transformedCode = transform('new MyClass(...[1, 2])');
      transformedCode = transformedCode.replace(/_result\d*/g, '_result');
      transformedCode = transformedCode.replace(/_class\d*/g, '_class');
      expect(transformedCode).toBe([
        spreadTemplates.closureStart,
          'var _class = MyClass, _result = Object.create(_class.prototype);',
          '_class', spreadTemplates.callExpressionBegin('_result'),
          '[',
            spreadTemplates.spreadLiteralBegin, '[1, 2]', spreadTemplates.spreadLiteralEnd,
          ']',
          spreadTemplates.callExpressionEnd, ';',
        'return _result;',
        spreadTemplates.closureEnd
      ].join(''));
    });
    
    it('should keep new lines and comments', function () {
      var transformedCode = transform('/*hello world*/ new  /*hello*/\nMyClass(\n /*comments*/ ...[1//comment\n, 2])');
      transformedCode = transformedCode.replace(/_result\d*/g, '_result');
      transformedCode = transformedCode.replace(/_class\d*/g, '_class');
      expect(transformedCode).toBe([
        '/*hello world*/  /*hello*/\n(function() { var _class = MyClass, _result = Object.create(_class.prototype);',
        '_class.apply(_result, Array.prototype.concat.apply([],[\n /*comments*/ ',
        '(function(array) { if (Array.isArray(array)) { return array }; throw new TypeError(array + \' is not an array\'); })([1//comment\n, 2])]));',
        'return _result;',
        '})()'
      ].join(''));
    });
   
    
  });
});


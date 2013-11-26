'use strict';

if (!Array.prototype.getIndexById){
    Array.prototype.getIndexById = function (id){
        if (id == null || id < 0){
            return -1;
        }
        for (var i = 0; i < this.length; i++){
            if (this[i].id == id){
                return i;
            }
        }
        return -1;
    };
}



var app = angular.module("testModule", ["ngGrid"]);

app.controller("TestController", function ($scope) {
    var socket = io.connect();
    
    $scope.isDataLoaded = false;
    
    $scope.selectedItems = [];
    
    $scope.myData = [];
    
    $scope.gridOptions = { 
        data: 'myData',
        selectedItems: $scope.selectedItems,
        multiSelect: false,
        enableCellEdit: true,
        enableCellSelection: true,
        enableRowSelection: true,
        enableCellEditOnFocus: true,
        enableColumnResize: true,
        enableColumnReordering: true,
        jqueryUITheme: false,
        columnDefs: [{ field: "id", displayName: "ID", width: 60, enableCellEdit: true },
                    { field: "field_a", displayName: "", width: 80, enableCellEdit: true },
                    { field: "phone", displayName: "NUMER", width: 110, enableCellEdit: true },
                    { field: "nip", displayName: "PESEL/NIP", width: 120, enableCellEdit: true },
                    { field: "contract_end", displayName: "KONIEC", width: 100, enableCellEdit: true },
                    { field: "phone_action", displayName: "T", width: 40, enableCellEdit: true },
                    { field: "sms_action", displayName: "S", width: 40, enableCellEdit: true },
                    { field: "enter_date", displayName: "WEJŚCIE", width: 100, enableCellEdit: true },
                    { field: "contact", displayName: "NR KONTAKT", width: 120, enableCellEdit: true },
                    { field: "comments", displayName: "KOMENTARZ", width: 120, enableCellEdit: true },
                    { field: "name", displayName: "NAZWA", width: 200, enableCellEdit: true },
                    { field: "address", displayName: "ADRES", width: 350, enableCellEdit: true },
                    { field: "field_b", displayName: "", width: 60, enableCellEdit: true },
                    { field: "last_edit", displayName: "zmiana", width: 80, enableCellEdit: true }]
    };
    
    // $scope.$on('ngGridEventStartCellEdit', function () {
    //           elm.focus();
    //           elm.select();
    //       });
    
    $scope.$on('ngGridEventStartCellEdit', function(evt){
        $scope.OriginalRow = angular.copy(evt.targetScope.row.entity);
    });

    $scope.$on('ngGridEventEndCellEdit', function(evt){
        $scope.UpdatedRow = evt.targetScope.row.entity;
        var isChanged = !(_.isEqual($scope.OriginalRow, $scope.UpdatedRow));
        if (isChanged) {
            var id = $scope.UpdatedRow["id"];
            var fieldName = evt.targetScope.col.field;
            var fieldValue = $scope.UpdatedRow[fieldName];
            socket.emit('update client', id, fieldName, fieldValue);
        }
    });
    
    $scope.add = function(){
        socket.emit('add client');
    };
    
    $scope.remove = function(){
        if ($scope.selectedItems.length > 0){
            var item = $scope.selectedItems[0];
            socket.emit('remove client', item);
        }
    };
    
    $scope.getData = function(){
        $scope.isDataLoaded = false;
        socket.emit('get clients');
    };
    
    socket.on('set clients', function (clients) {
        $scope.myData = clients;
        $scope.isDataLoaded = true;
        $scope.$apply();
    });
    
    socket.on('client removed', function(client) {
        if (client != null){
            var idx = $scope.myData.getIndexById(client.id);
            if (idx >= 0) {
                $scope.myData.splice(idx, 1);
                $scope.$apply();
            }
        }
    });
    
    socket.on('client added', function(client) {
        if (client != null) {
            $scope.myData.splice(0, 0, client);
            $scope.$apply();
        }
    });
    
    socket.on('client updated', function(client) {
        if (client != null) {
            var idx = $scope.myData.getIndexById(client.id);
            if (idx >= 0) {
                $scope.myData.splice(idx, 1);
                $scope.$apply();
                $scope.myData.splice(idx, 0, client);
                $scope.$apply();
            }
        }
    });
    
    $scope.getData();

});
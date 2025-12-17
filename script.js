const mapType = 'ets';
const mapConfig = mapinfo[mapType];
const etsCRS = L.Util.extend({}, L.CRS.Simple, {
    transformation: new L.Transformation(
        mapConfig.factorX,
        -mapConfig.minX * mapConfig.factorX,
        mapConfig.factorY,
        -mapConfig.minY * mapConfig.factorY
    )
});

const bounds = [
    [mapConfig.minY, mapConfig.minX],
    [mapConfig.maxY, mapConfig.maxX]
];

const map = L.map('map', {
    crs: etsCRS,
    minZoom: mapConfig.minZoom,
    maxZoom: mapConfig.maxZoom,
    zoomSnap: 0.5,
    wheelPxPerZoomLevel: 120,
    center: [0, 0],
    zoom: mapConfig.minZoom,
    maxBounds: bounds,
    maxBoundsViscosity: 0.8,
    attributionControl: false
});

// 添加瓦片图层
L.tileLayer(`https://ets-map.oss-cn-beijing.aliyuncs.com/tiles/${mapType}/{z}/{x}/{y}.png`, {
    tileSize: mapConfig.tileSize,
    noWrap: true,
    bounds: bounds,
}).addTo(map);

// 鼠标位置坐标展示
map.on('mousemove', _.throttle((e) => {
    document.querySelector('.axis-box').innerHTML = `x: ${e.latlng.lng.toFixed(2)} y: ${e.latlng.lat.toFixed(2)}`;
}, 100));

// 鼠标点击控制台打印坐标
map.on('click', (e) => {
    console.log(`点击坐标 x: ${e.latlng.lng.toFixed(2)} y: ${e.latlng.lat.toFixed(2)}`);
});

// 显示瓦片边框和编号
L.GridLayer.DebugCoords = L.GridLayer.extend({
    createTile: function (coords) {
        var tile = document.createElement('div');
        tile.innerHTML = `<span style="background-color: hsla(0, 0%, 0%, 80%);padding: 0 4px">x:${coords.x} y:${coords.y} s:${coords.z}</span>`;
        tile.style.outline = '1px solid hsla(0, 0%, 70%, 30%)';
        tile.style.color = 'hsl(0, 0%, 100%)';
        tile.style.fontSize = '14px';
        tile.style.fontWeight = 'bold';
        return tile;
    }
});
// map.addLayer(new L.GridLayer.DebugCoords());

// 地图移动结束打印矩形坐标
map.on('moveend', function(e) {
    let bounds = map.getBounds();
    let minX = bounds.getWest();
    let minY = bounds.getSouth();
    let maxX = bounds.getEast();
    let maxY = bounds.getNorth();
    console.log(`地图移动结束 minX:${minX.toFixed(2)} minY:${minY.toFixed(2)} maxX:${maxX.toFixed(2)} maxY:${maxY.toFixed(2)}`);
    refreshPoint();
});

// 缩放级别变动
map.on('zoomend', function() {
    const currentZoom = map.getZoom();
    console.log('zoom: ', currentZoom);
    refreshCountry(currentZoom);
    refreshCity(currentZoom);
    refreshPoint();
});

// 设置国家标点
axios.get('https://da.vtcm.link/map/marker?mapType=1&type=1').then(({data}) => {
    if (data.code === 200) {
        data.data.forEach(country => {
            let myCustomIcon = L.divIcon({
                html: `
                    <div class="country-box">
                        <img class="flag" src="${country.iconUrl}"/>
                        <div class="name">${country.name}</div>
                    </div>
                `,
                className: 'leaflet-clean',
                iconSize: null,
                iconAnchor: [0, 0]
            });
            L.marker([country.axisY, country.axisX], { icon: myCustomIcon }).addTo(map);
        });
    }
});

// 设置城市标点
axios.get('https://da.vtcm.link/map/marker?mapType=1&type=2').then(({data}) => {
    if (data.code === 200) {
        data.data.forEach(country => {
            let myCustomIcon = L.divIcon({
                html: `<div class="city-box"><span>${country.name}</span></div>`,
                className: 'leaflet-clean',
                iconSize: null,
                iconAnchor: [0, 0]
            });
            L.marker([country.axisY, country.axisX], { icon: myCustomIcon }).addTo(map);
        });
    }
});

const refreshCountry = (zoom) => {
    if (zoom >= 4) {
        document.querySelector('#map').style.setProperty('--country-opacity', '0')
    } else {
        document.querySelector('#map').style.setProperty('--country-opacity', '1')
    }
}

const refreshCity = (zoom) => {
    if (zoom >= 4) {
        document.querySelector('#map').style.setProperty('--city-opacity', '1')
    } else {
        document.querySelector('#map').style.setProperty('--city-opacity', '0')
    }
}

let pointMap = new Map();
const refreshPoint = _.throttle(() => {
    const zoom = map.getZoom();
    if (zoom >= 6) {
        document.querySelector('#map').style.setProperty('--point-opacity', '0')
        let minX = map.getBounds().getWest();
        let minY = map.getBounds().getSouth();
        let maxX = map.getBounds().getEast();
        let maxY = map.getBounds().getNorth();
        axios.get(`https://da.vtcm.link/map/marker?mapType=1&aAxisX=${(minX - 200).toFixed(2)}&aAxisY=${(minY - 200).toFixed(2)}&bAxisX=${(maxX + 200).toFixed(2)}&bAxisY=${(maxY + 200).toFixed(2)}`).then(({data}) => {
            if (data.code === 200) {
                data.data.forEach(point => {
                    // 跳过国家、城市和已存在的标点
                    if (point.type === 1 || point.type === 2 || pointMap.has(point.id)) {
                        return;
                    }

                    let html = '<div class="point-box">';
                    if (point.type === 3) {
                        html += `<img class="company" src="${point.iconUrl}" alt="${point.name}"/>`;
                    } else if ([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 99].includes(point.type)) {
                        html += `<img class="point" src="${point.iconUrl}" alt="point"/>`;
                    } else {
                        return;
                    }
                    html += `</div>`;

                    let myCustomIcon = L.divIcon({
                        html,
                        className: 'leaflet-clean',
                        iconSize: null,
                        iconAnchor: [0, 0]
                    });
                    let marker = L.marker([point.axisY, point.axisX], { icon: myCustomIcon }).addTo(map);
                    pointMap.set(point.id, marker);
                });
            }
        });
    } else {
        pointMap.forEach((val) => val.remove());
        pointMap.clear();
    }
    if (zoom >= 7) {
        document.querySelector('#map').style.setProperty('--point-opacity', '1')
    } else {
        document.querySelector('#map').style.setProperty('--point-opacity', '0')
    }
}, 200)
refreshPoint();

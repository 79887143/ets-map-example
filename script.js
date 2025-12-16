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
map.addLayer(new L.GridLayer.DebugCoords());

// 地图移动结束打印矩形坐标
map.on('moveend', function(e) {
    let bounds = map.getBounds();
    let minX = bounds.getWest();
    let minY = bounds.getSouth();
    let maxX = bounds.getEast();
    let maxY = bounds.getNorth();
    console.log(`地图移动结束 minX:${minX.toFixed(2)} minY:${minY.toFixed(2)} maxX:${maxX.toFixed(2)} maxY:${maxY.toFixed(2)}`);
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
            iconSize: null, // 重要！设置为 null，让 CSS 决定宽度，否则长文字会被裁切
            iconAnchor: [0, 0] // 调整锚点，使图标的"尖端"对准坐标点
        });
        L.marker([country.axisY, country.axisX], { icon: myCustomIcon }).addTo(map);
        });
    }
});